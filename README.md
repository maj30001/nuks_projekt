# nuks_projekt
nuks_projekt

## 1. Ideja za projekt in opis (Mejnik 1)
Cilj projekta je razviti platformo, kjer se lahko amaterski astrofotografi registrirajo, ustvarijo svoj profil in delijo svoje fotografije vesolja. Po vzoru platform kot sta Astrobin in Telescopius.

Glavne funkcionalnosti bodo vključevale:
* Registracijo in prijavo uporabnikov.
* Nalaganje slikovnega materiala.
* Zapisovanje metapodatkov o fotografiji (uporabljen teleskop, kamera, montaža, čas ekspozicije, filtri).
* Pregledovanje in branje objav drugih uporabnikov (galerija).

## 2. Načrtovana arhitektura:

* **Frontend:** React (za prikaz galerije in interakcijo z uporabnikom).
* **API Gateway / Proxy:** Nginx (usmerjanje prometa do ustreznih mikrostoritev).
* **Mikrostoritve (Backend):** * `User Service` (Python/FastAPI) - upravljanje uporabnikov in avtentikacije.
    * `Post Service` (Python/FastAPI) - upravljanje objav, metapodatkov in logike za slike.
* **Podatkovne baze:** * PostgreSQL (relacijska baza za uporabnike in metapodatke).
    * MongoDB (nerelacijska baza za shranjevanje komentarjev in dodatnih dinamičnih podatkov).
* **Shranjevanje datotek:** S3 API / Min.io instanca (shranjevanje slikovnih datotek).
* **Centralizirano logiranje:** Grafana in Prometheus.

## 3. Skica arhitekture

```mermaid
graph TD
    %% Barve in stili
    classDef frontend fill:#61dafb,stroke:#333,stroke-width:2px,color:black;
    classDef gateway fill:#009639,stroke:#333,stroke-width:2px,color:white;
    classDef backend fill:#3776ab,stroke:#333,stroke-width:2px,color:white;
    classDef database fill:#336791,stroke:#333,stroke-width:2px,color:white;
    classDef storage fill:#ff9900,stroke:#333,stroke-width:2px,color:black;
    classDef monitoring fill:#f46800,stroke:#333,stroke-width:2px,color:white;

    %% Komponente
    User((Uporabnik)) -->|Brskalnik| React[React Frontend]:::frontend
    React -->|API klici| Nginx[Nginx API Gateway / Proxy]:::gateway

    Nginx -->|Promet za prijavo| UserSV[User Service <br> mikrostoritev]:::backend
    Nginx -->|Promet za galerijo| PostSV[Post Service <br> mikrostoritev]:::backend

    UserSV -->|Branje/Pisanje uporabnikov| Postgres[(PostgreSQL <br> relacijska baza)]:::database
    PostSV -->|Branje/Pisanje metapodatkov| Postgres
    
    PostSV -->|Branje/Pisanje komentarjev| Mongo[(MongoDB <br> nerelacijska baza)]:::database
    PostSV -->|Nalaganje/Prikaz slik| S3[(Min.io <br> S3 API)]:::storage

    %% Centralizirano logiranje
    UserSV -.->|Pošiljanje metrik| Prom[Prometheus <br> zbiranje logov]:::monitoring
    PostSV -.->|Pošiljanje metrik| Prom
    Nginx -.->|Pošiljanje metrik| Prom
    
    Prom --> Grafana[Grafana <br> vizualizacija logov]:::monitoring