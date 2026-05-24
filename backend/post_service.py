import os
import io
import boto3
import pymongo  # NOVO: Za povezavo z MongoDB
from bson import ObjectId  # NOVO: Za delo z ID-ji baze
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from PIL import Image

app = FastAPI(
    title="DarkFrame - Post Service", 
    description="API za objavljanje astrofotografij s trajnim shranjevanjem v MongoDB in S3",
    version="2.0.0"
)

# --- S3 (Min.io) Konfiguracija ---
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://212.235.185.13:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "user-03")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "thestrongestvajePass03")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "user-03")

s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

# Samodejno preberemo uporabnika in geslo iz okolja (.env datoteke)
MONGO_USER = os.getenv("MONGO_INITDB_ROOT_USERNAME", "darkframe_admin")
MONGO_PASSWORD = os.getenv("MONGO_INITDB_ROOT_PASSWORD", "mongo_super_secret")

MONGO_URI = f"mongodb://{MONGO_USER}:{MONGO_PASSWORD}@mongo-db:27017/?authSource=admin"
mongo_client = pymongo.MongoClient(MONGO_URI)
db = mongo_client["darkframe_db"]
posts_collection = db["posts"]

class PostMetadata(BaseModel):
    teleskop: str
    kamera: str
    montaza: str
    cas_ekspozicije: str

class CreatePost(BaseModel):
    naslov: str
    opis: str
    metapodatki: PostMetadata

class Comment(BaseModel):
    besedilo: str
    avtor: str = "AstroGost"

@app.post("/api/posts", tags=["Galerija"])
def create_post(post: CreatePost):
    """Ustvarjanje nove objave v MongoDB bazi."""
    nova_objava = {
        "naslov": post.naslov,
        "opis": post.opis,
        "oprema": post.metapodatki.dict(),
        "s3_kljuc": None,
        "komentarji": []
    }
    # Shranimo direktno v trajno bazo
    result = posts_collection.insert_one(nova_objava)
    return {"sporocilo": "Objava ustvarjena v bazi", "post_id": str(result.inserted_id)}

@app.post("/api/posts/{post_id}/image", tags=["Galerija"])
def upload_post_image(post_id: str, file: UploadFile = File(...)):
    """Nalaganje slike na S3 in posodobitev zapisa v MongoDB."""
    try:
        file_name = f"post_{post_id}_{file.filename}"
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_name,
            Body=file.file.read(),
            ContentType=file.content_type
        )
        
        # Posodobimo ključ slike v MongoDB bazi za točno to objavo
        result = posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"s3_kljuc": file_name}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Objava ne obstaja v bazi")
            
        return {"sporocilo": "Slika uspešno naložena v S3 in zabeležena v bazi!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka: {str(e)}")

@app.get("/api/posts/{post_id}/slika", tags=["Galerija"])
def get_post_image(post_id: str):
    try:
        objava = posts_collection.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Neveljaven ID formata baze")
        
    if not objava or not objava.get("s3_kljuc"):
        raise HTTPException(status_code=404, detail="Slika ne obstaja")
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=objava["s3_kljuc"])
        return StreamingResponse(response['Body'].iter_chunks(), media_type=response.get('ContentType', 'image/jpeg'))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/posts/{post_id}/thumbnail", tags=["Galerija"])
def get_post_thumbnail(post_id: str):
    try:
        objava = posts_collection.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Neveljaven ID formata baze")
        
    if not objava or not objava.get("s3_kljuc"):
        raise HTTPException(status_code=404, detail="Slika ne obstaja")
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=objava["s3_kljuc"])
        img = Image.open(io.BytesIO(response['Body'].read()))
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        img.thumbnail((400, 400))
        bajtni_tok = io.BytesIO()
        img.save(bajtni_tok, format="JPEG", quality=85)
        bajtni_tok.seek(0)
        return StreamingResponse(bajtni_tok, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/posts", tags=["Galerija"])
def get_all_posts():
    """Pridobitev vseh objav iz MongoDB baze."""
    objave = list(posts_collection.find())
    # Preuredimo MongoDB '_id' objekt v navaden 'post_id' string, ki ga razume React frontend
    for o in objave:
        o["post_id"] = str(o["_id"])
        del o["_id"]
    return objave

@app.post("/api/posts/{post_id}/komentarji", tags=["Galerija"])
def add_comment(post_id: str, komentar: Comment):
    """Dodajanje komentarja direktno v tabelo znotraj MongoDB."""
    try:
        result = posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$push": {"komentarji": komentar.dict()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Objava ne obstaja")
        return {"sporocilo": "Komentar uspešno dodan in trajno shranjen!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))