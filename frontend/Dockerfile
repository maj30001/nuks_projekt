# Uporabimo lahko in moderno Node.js sliko
FROM node:20-alpine

WORKDIR /app

# Kopiramo package.json in namestimo knjižnice
COPY package*.json ./
RUN npm install

# Kopiramo preostalo kodo
COPY . .

# Odpremo port, na katerem teče Vite
EXPOSE 5173

# Zaženemo React aplikacijo in ji dovolimo zunanje povezave (--host)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]