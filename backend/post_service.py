from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="NUKS projekt - Post Service", 
    description="API za objavljanje astrofotografij in pregled galerije",
    version="1.0.0"
)

# Definicija podatkovnih modelov
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

class Comment(BaseModel):
    uporabnik_id: int
    besedilo: str

@app.get("/", tags=["Osnovno"])
def read_root():
    """Preverjanje, če API deluje."""
    return {"test"}

# API klici (Endpoints)
@app.get("/api/posts", tags=["Galerija"])
def get_all_posts():
    """Pridobitev seznama vseh astrofotografij za glavno galerijo."""
    return [
        {"post_id": 1, "naslov": "Meglica Orion (M42)", "avtor_id": 1},
        {"post_id": 2, "naslov": "Galaksija Andromeda (M31)", "avtor_id": 2}
    ]

@app.post("/api/posts", tags=["Galerija"])
def create_post(post: CreatePost):
    """Ustvarjanje nove objave (samo metapodatki). Sliko se naloži ločeno."""
    return {"sporocilo": "Objava uspešno ustvarjena", "naslov": post.naslov, "post_id": 3}

@app.post("/api/posts/{post_id}/image", tags=["Galerija"])
def upload_post_image(post_id: int, file: UploadFile = File(...)):
    """Nalaganje slikovne datoteke (.jpg, .png) za obstoječo objavo. Slika se shrani v Min.io (S3)."""
    return {"sporocilo": f"Datoteka '{file.filename}' uspešno naložena v S3 za objavo ID: {post_id}."}

@app.get("/api/posts/{post_id}", tags=["Galerija"])
def get_post_details(post_id: int):
    """Pridobitev vseh podrobnosti in metapodatkov posamezne slike."""
    return {
        "post_id": post_id, 
        "naslov": "Meglica Orion (M42)", 
        "metapodatki": {
            "teleskop": "SkyWatcher 150/750",
            "kamera": "ZWO ASI 533MC Pro",
            "montaza": "HEQ5 Pro",
            "cas_ekspozicije": "2 ure"
        }
    }

@app.delete("/api/posts/{post_id}", tags=["Galerija"])
def delete_post(post_id: int):
    """Izbris objave (izbriše metapodatke iz baze in sliko iz Min.io S3)."""
    return {"sporocilo": f"Objava {post_id} uspešno izbrisana."}

@app.post("/api/posts/{post_id}/comments", tags=["Komentarji"])
def add_comment(post_id: int, comment: Comment):
    """Dodajanje komentarja pod izbrano astrofotografijo (shrani v MongoDB)."""
    return {"sporocilo": "Komentar uspešno dodan", "post_id": post_id}

@app.get("/api/posts/{post_id}/comments", tags=["Komentarji"])
def get_comments(post_id: int):
    """Pridobitev seznama vseh komentarjev za izbrano objavo (iz MongoDB)."""
    return [
        {"uporabnik_id": 2, "besedilo": "Nora slika! Kakšen filter si uporabil?"},
        {"uporabnik_id": 3, "besedilo": "Super fokus na zvezdah, čestitke."}
    ]