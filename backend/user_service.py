from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="NUKS projekt - User Service", 
    description="API za upravljanje uporabnikov in avtentikacijo",
    version="1.0.0"
)

# Definicija podatkovnih modelov
class UserRegister(BaseModel):
    uporabnisko_ime: str
    email: str
    geslo: str

class UserLogin(BaseModel):
    email: str
    geslo: str

@app.get("/", tags=["Osnovno"])
def read_root():
    """Preverjanje, če API deluje."""
    return {"test": "API deluje"}

# API klici (Endpoints)
@app.post("/api/users/register", tags=["Uporabniki"])
def register_user(user: UserRegister):
    """Registracija novega amaterskega astrofotografa."""
    return {"sporocilo": "Uporabnik uspešno registriran", "uporabnik": user.uporabnisko_ime}

@app.post("/api/users/login", tags=["Uporabniki"])
def login_user(user: UserLogin):
    """Prijava in pridobitev JWT žetona za dostop."""
    return {"access_token": "zacasni_jwt_zeton_12345", "token_type": "bearer"}

@app.get("/api/users/me", tags=["Uporabniki"])
def get_current_user():
    """Pridobitev podatkov trenutno prijavljenega uporabnika (za profil na frontendu)."""
    return {"user_id": 1, "uporabnisko_ime": "AstroMojster", "email": "astro@primer.si"}

@app.get("/api/users/{user_id}", tags=["Uporabniki"])
def get_user_profile(user_id: int):
    """Pridobitev javnega profila določenega uporabnika."""
    return {"user_id": user_id, "uporabnisko_ime": "AstroMojster", "email": "astro@primer.si"}

@app.post("/api/users/logout", tags=["Uporabniki"])
def logout_user():
    """Odjava uporabnika in razveljavitev žetona."""
    return {"sporocilo": "Uporabnik uspešno odjavljen"}