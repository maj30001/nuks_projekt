import os
import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="DarkFrame - Post Service", 
    description="API za objavljanje astrofotografij in shranjevanje na S3 (Min.io)",
    version="1.0.0"
)

# --- S3 (Min.io) Konfiguracija iz Docker spremenljivk ---
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://212.235.185.13:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "user-03")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "thestrongestvajePass03")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "darkframe-slike-user03")

# Priprava boto3 klienta za S3
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY
)

# Modeli podatkov
class PostMetadata(BaseModel):
    teleskop: str
    kamera: str
    montaza: str
    cas_ekspozicije: str
    filtri: Optional[str] = None

class CreatePost(BaseModel):
    naslov: str
    opis: str
    metapodatki: PostMetadata

@app.get("/", tags=["Osnovno"])
def read_root():
    return {"sporocilo": "DarkFrame Post API s priklopljenim S3!"}

# API klici
@app.post("/api/posts", tags=["Galerija"])
def create_post(post: CreatePost):
    """Ustvarjanje nove objave (samo metapodatki)."""
    return {"sporocilo": "Objava uspešno ustvarjena", "naslov": post.naslov, "post_id": 3}

@app.post("/api/posts/{post_id}/image", tags=["Galerija"])
def upload_post_image(post_id: int, file: UploadFile = File(...)):
    """Nalaganje slikovne datoteke direktno na fakultetni S3 (Min.io) strežnik."""
    try:
        # 1. Preverimo, če bucket obstaja, sicer ga ustvarimo
        try:
            s3_client.head_bucket(Bucket=S3_BUCKET_NAME)
        except ClientError:
            s3_client.create_bucket(Bucket=S3_BUCKET_NAME)
        
        # 2. Generiramo unikatno ime datoteke in preberemo vsebino
        file_name = f"post_{post_id}_{file.filename}"
        file_content = file.file.read()

        # 3. Naložimo na S3
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_name,
            Body=file_content,
            ContentType=file.content_type
        )
        
        return {
            "sporocilo": f"Datoteka '{file.filename}' uspešno naložena v S3!", 
            "s3_bucket": S3_BUCKET_NAME,
            "s3_kljuc": file_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Napaka pri nalaganju v S3: {str(e)}")

@app.get("/api/posts/{post_id}", tags=["Galerija"])
def get_post_details(post_id: int):
    """Pridobitev vseh podrobnosti in metapodatkov posamezne slike."""
    return {
        "post_id": post_id, 
        "naslov": "Meglica Orion (M42)", 
        "slika_s3_url": f"{S3_ENDPOINT}/{S3_BUCKET_NAME}/post_{post_id}_slika.jpg"
    }