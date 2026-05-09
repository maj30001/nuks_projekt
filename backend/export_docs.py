import json
import os
from user_service import app as user_app
from post_service import app as post_app

# Prepričamo se, da mapa docs sploh obstaja
os.makedirs("../docs", exist_ok=True)

# 1. Ustvarjanje JSON datotek (Surovi podatki)
with open("../docs/user_api.json", "w", encoding="utf-8") as f:
    json.dump(user_app.openapi(), f, indent=2)

with open("../docs/post_api.json", "w", encoding="utf-8") as f:
    json.dump(post_app.openapi(), f, indent=2)

# 2. Funkcija za generiranje interaktivne HTML vizualizacije
def generate_html_docs(json_filename, html_filename, title):
    html_content = f"""<!DOCTYPE html>
<html>
  <head>
    <title>{title}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body {{ margin: 0; padding: 0; }}</style>
  </head>
  <body>
    <redoc spec-url='{json_filename}'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>"""
    
    with open(f"../docs/{html_filename}", "w", encoding="utf-8") as f:
        f.write(html_content)

# 3. Klic funkcije za oba naša API-ja
generate_html_docs("user_api.json", "user_docs.html", "DarkFrame - User API Docs")
generate_html_docs("post_api.json", "post_docs.html", "DarkFrame - Post API Docs")

print("✅ Uspeh! V mapi 'docs' so bile posodobljene JSON in HTML datoteke.")