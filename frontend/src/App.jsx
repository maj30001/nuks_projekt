import { useState, useEffect } from 'react'

function App() {
  const [aktivniZavihek, setAktivniZavihek] = useState('galerija')
  const [izbranaObjava, setIzbranaObjava] = useState(null)
  const [novKomentar, setNovKomentar] = useState('')
  
  // Avtentikacija (Stanje uporabnika)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [uporabnik, setUporabnik] = useState(localStorage.getItem('username') || null)
  const [authNačin, setAuthNačin] = useState('login')

  // Stanja za prijavo
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authStatus, setAuthStatus] = useState('')

  // Stanja za obrazec nove objave
  const [naslov, setNaslov] = useState('')
  const [opis, setOpis] = useState('')
  const [teleskop, setTeleskop] = useState('')
  const [kamera, setKamera] = useState('')
  const [montaza, setMontaza] = useState('')
  const [ekspozicija, setEkspozicija] = useState('')
  const [slika, setSlika] = useState(null)
  const [status, setStatus] = useState('')

  const [galerija, setGalerija] = useState([])

  // --- NOVO: Stanje za povečano sliko ---
  const [povečanaSlikaUrl, setPovečanaSlikaUrl] = useState(null)

  const osveziGalerijo = () => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGalerija(data)
          if (izbranaObjava) {
            const osvezena = data.find(o => o.post_id === izbranaObjava.post_id)
            if (osvezena) setIzbranaObjava(osvezena)
          }
        }
      })
      .catch(err => console.error(err))
  }

  useEffect(() => {
    if (aktivniZavihek === 'galerija') {
      osveziGalerijo()
      setIzbranaObjava(null)
    }
    setAuthStatus('')
  }, [aktivniZavihek])

  const odpriObjavo = (objava) => {
    setIzbranaObjava(objava)
    setAktivniZavihek('objava')
  }

  // --- NOVO: Funkcija za odpiranje povečave slike ---
  const handleSlikaPovečana = (imageUrl) => {
    setPovečanaSlikaUrl(imageUrl)
  }

  // --- NOVO: Funkcija za zapiranje povečave ---
  const handleZapriPovečavo = () => {
    setPovečanaSlikaUrl(null)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthStatus('⏳ Obdelujem...')
    
    const url = authNačin === 'register' ? '/api/users/register' : '/api/users/login'
    const bodyData = authNačin === 'register' 
      ? { uporabnisko_ime: username, email: email, geslo: password } 
      : { uporabnisko_ime: username, email: username, geslo: password }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })
      const data = await res.json()

      if (res.ok) {
        if (authNačin === 'register') {
          setAuthStatus('✅ Račun uspešno ustvarjen! Zdaj se lahko prijaviš.')
          setAuthNačin('login')
          setPassword('')
        } else {
          const uspesenToken = data?.token || data?.access_token || 'simuliran-jwt-token'
          setToken(uspesenToken)
          setUporabnik(username)
          localStorage.setItem('token', uspesenToken)
          localStorage.setItem('username', username)
          setAuthStatus('✅ Prijava uspešna!')
          setTimeout(() => setAktivniZavihek('galerija'), 1000)
        }
      } else {
        let izpisNapake = 'Prijava/Registracija ni uspela'
        if (data && data.detail) {
          if (typeof data.detail === 'string') {
            izpisNapake = data.detail
          } else if (Array.isArray(data.detail)) {
            izpisNapake = data.detail.map(err => {
              const polje = err.loc ? err.loc[err.loc.length - 1] : 'vnos'
              return `${polje}: ${err.msg}`
            }).join(', ')
          } else if (typeof data.detail === 'object') {
            izpisNapake = JSON.stringify(data.detail)
          }
        }
        setAuthStatus(`❌ Napaka: ${izpisNapake}`)
      }
    } catch (err) {
      setAuthStatus(`❌ Napaka pri povezavi: ${err.message}`)
    }
  }

  const handleOdjava = () => {
    setToken(null)
    setUporabnik(null)
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setAktivniZavihek('galerija')
  }

  const oddajObjavo = async (e) => {
    e.preventDefault()
    if (!token) return setStatus('❌ Za objavljanje se moraš prijaviti!')
    if (!slika) return setStatus('❌ Prosim, izberi sliko!')
    
    setStatus('⏳ Ustvarjam objavo...')
    try {
      const resMeta = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naslov, opis, metapodatki: { teleskop, kamera, montaza, cas_ekspozicije: ekspozicija } })
      })
      const metaData = await resMeta.json()

      const formData = new FormData()
      formData.append('file', slika)
      const resSlika = await fetch(`/api/posts/${metaData.post_id}/image`, { method: 'POST', body: formData })

      if (resSlika.ok) {
        setStatus('✅ Objava uspešno shranjena!')
        setNaslov(''); setOpis(''); setTeleskop(''); setKamera(''); setMontaza(''); setEkspozicija(''); setSlika(null);
        setTimeout(() => { setAktivniZavihek('galerija'); setStatus(''); }, 1500)
      } else {
        setStatus('❌ Napaka pri nalaganju slike.')
      }
    } catch (error) { setStatus(`❌ Napaka: ${error.message}`) }
  }

  const oddajKomentar = async (e) => {
    e.preventDefault()
    if (!token) return alert('Za komentiranje moraš biti prijavljen!')
    if (!novKomentar.trim()) return

    await fetch(`/api/posts/${izbranaObjava.post_id}/komentarji`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ besedilo: novKomentar, avtor: uporabnik })
    })
    setNovKomentar('')
    osveziGalerijo()
  }

  // NOVO: Inline stili za modal povečave
  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.85)', // temno, polprosojno ozadje
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // zagotavlja, da je na vrhu vsega
    cursor: 'pointer', // klik kjerkoli zapre modal
  };

  const largeImageStyle = {
    maxWidth: '90%', // maksimalna širina slike
    maxHeight: '90%', // maksimalna višina slike
    objectFit: 'contain', // ohrani razmerje stranic in se prilagodi
    cursor: 'pointer', // klik na sliko tudi zapre modal
    borderRadius: '4px', // majhni zaobljeni robovi
    border: '2px solid #34495e', // majhen obrob za definicijo
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px', color: '#ecf0f1' }}>
      
      <style>{`body { background-color: #1a1e24; margin: 0; } input, textarea { background: #2c3e50; color: white; border: 1px solid #34495e; border-radius: 4px; }`}</style>

      {/* GLAVA IN NAVIGACIJA */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #34495e', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1 onClick={() => setAktivniZavihek('galerija')} style={{ margin: 0, color: '#3498db', cursor: 'pointer', userSelect: 'none' }}>
          🌌 DarkFrame
        </h1>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setAktivniZavihek('galerija')} style={{ padding: '10px 20px', cursor: 'pointer', background: aktivniZavihek === 'galerija' ? '#3498db' : '#2c3e50', color: 'white', border: 'none', borderRadius: '5px' }}>Galerija</button>
          
          {token && (
            <button onClick={() => setAktivniZavihek('nalaganje')} style={{ padding: '10px 20px', cursor: 'pointer', background: aktivniZavihek === 'nalaganje' ? '#3498db' : '#2c3e50', color: 'white', border: 'none', borderRadius: '5px' }}>Nova Objava</button>
          )}

          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
              <span style={{ fontSize: '14px', color: '#2ecc71' }}>🧑 {uporabnik}</span>
              <button onClick={handleOdjava} style={{ padding: '10px 15px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px' }}>Odjava</button>
            </div>
          ) : (
            <button onClick={() => setAktivniZavihek('auth')} style={{ padding: '10px 20px', cursor: 'pointer', background: aktivniZavihek === 'auth' ? '#3498db' : '#2c3e50', color: 'white', border: 'none', borderRadius: '5px', marginLeft: '10px' }}>Prijava / Registracija</button>
          )}
        </nav>
      </header>

      {/* 1. ZAVIHEK: GALERIJA */}
      {aktivniZavihek === 'galerija' && (
        <div>
          <h2 style={{ color: '#fff' }}>Nedavne objave</h2>
          {galerija.length === 0 ? <p style={{ color: '#7f8c8d' }}>Galerija je prazna. Naloži prvo sliko vesolja!</p> : (
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
              {galerija.map((objava, i) => (
                <div key={i} onClick={() => odpriObjavo(objava)} style={{ border: '1px solid #34495e', padding: '15px', borderRadius: '8px', background: '#2c3e50', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {objava.s3_kljuc ? (
                    <img src={`/api/posts/${objava.post_id}/thumbnail`} alt={objava.naslov} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#000' }} />
                  ) : <div style={{ height: '220px', backgroundColor: '#000', borderRadius: '4px' }}>Ni slike</div>}
                  <h3 style={{ margin: '15px 0 5px 0', color: '#ecf0f1' }}>{objava.naslov || 'Brez naslova'}</h3>
                  <p style={{ color: '#bdc3c7', fontSize: '14px', margin: 0 }}>🔬 {objava.oprema?.teleskop || '/'} | ⏱️ {objava.oprema?.cas_ekspozicije || '/'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ZAVIHEK: PODROBNOSTI OBJAVE */}
      {aktivniZavihek === 'objava' && izbranaObjava && (
        <div style={{ background: '#2c3e50', padding: '20px', borderRadius: '8px' }}>
          <button onClick={() => setAktivniZavihek('galerija')} style={{ background: 'transparent', color: '#3498db', border: 'none', cursor: 'pointer', padding: 0, fontSize: '16px', marginBottom: '15px' }}>← Nazaj v galerijo</button>
          
          <h2 style={{ marginTop: 0, color: '#fff' }}>{izbranaObjava.naslov || 'Brez naslova'}</h2>
          {izbranaObjava.s3_kljuc && (
            <img 
              src={`/api/posts/${izbranaObjava.post_id}/slika`} 
              alt="Astro" 
              // --- POSODOBLJENO: onClick za odpiranje povečave ---
              onClick={() => handleSlikaPovečana(`/api/posts/${izbranaObjava.post_id}/slika`)}
              style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '8px', marginBottom: '15px', cursor: 'pointer' }} // Dodan cursor: pointer
            />
          )}
          <p style={{ fontSize: '16px', color: '#ecf0f1' }}>{izbranaObjava.opis || 'Brez opisa.'}</p>
          
          <div style={{ background: '#34495e', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Tehnični podatki</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#bdc3c7' }}>
              <li><strong>Teleskop:</strong> {izbranaObjava.oprema?.teleskop || '/'}</li>
              <li><strong>Kamera:</strong> {izbranaObjava.oprema?.kamera || '/'}</li>
              <li><strong>Montaža:</strong> {izbranaObjava.oprema?.montaza || '/'}</li>
              <li><strong>Ekspozicija:</strong> {izbranaObjava.oprema?.cas_ekspozicije || '/'}</li>
            </ul>
          </div>

          <hr style={{ borderColor: '#34495e', margin: '30px 0' }} />
          
          <h3>Komentarji ({izbranaObjava.komentarji ? izbranaObjava.komentarji.length : 0})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {izbranaObjava.komentarji && izbranaObjava.komentarji.map((kom, i) => (
              <div key={i} style={{ background: '#1a1e24', padding: '10px 15px', borderRadius: '5px' }}>
                <strong style={{ color: '#3498db' }}>{kom.avtor || 'AstroGost'}</strong>
                <p style={{ margin: '5px 0 0 0', color: '#bdc3c7' }}>{kom.besedilo}</p>
              </div>
            ))}
          </div>

          {token ? (
            <form onSubmit={oddajKomentar} style={{ display: 'flex', gap: '10px' }}>
              <input type="text" value={novKomentar} onChange={(e) => setNovKomentar(e.target.value)} placeholder="Dodaj komentar..." style={{ flex: 1, padding: '10px' }} required />
              <button type="submit" style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pošlji</button>
            </form>
          ) : (
            <p style={{ color: '#e74c3c', fontStyle: 'italic', background: '#1a1e24', padding: '10px', borderRadius: '5px', textAlign: 'center' }}>
              🔒 Za pisanje komentarjev se moraš <span onClick={() => setAktivniZavihek('auth')} style={{ color: '#3498db', cursor: 'pointer', textDecoration: 'underline' }}>prijaviti</span>.
            </p>
          )}
        </div>
      )}

      {/* 3. ZAVIHEK: LOGIN / REGISTRACIJA */}
      {aktivniZavihek === 'auth' && (
        <div style={{ background: '#2c3e50', padding: '30px', borderRadius: '8px', maxWidth: '400px', margin: '40px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', borderBottom: '1px solid #34495e', paddingBottom: '10px' }}>
            <span onClick={() => { setAuthNačin('login'); setAuthStatus(''); }} style={{ cursor: 'pointer', fontWeight: 'bold', color: authNačin === 'login' ? '#3498db' : '#bdc3c7' }}>Prijava</span>
            <span onClick={() => { setAuthNačin('register'); setAuthStatus(''); }} style={{ cursor: 'pointer', fontWeight: 'bold', color: authNačin === 'register' ? '#3498db' : '#bdc3c7' }}>Registracija</span>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Uporabniško ime / Email" required value={username} onChange={(e) => setUsername(e.target.value)} style={{ padding: '10px' }} />
            
            {authNačin === 'register' && (
              <input type="email" placeholder="E-poštni naslov" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px' }} />
            )}
            
            <input type="password" placeholder="Geslo" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px' }} />
            
            <button type="submit" style={{ padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {authNačin === 'login' ? 'Prijava' : 'Registracija'}
            </button>
          </form>
          {authStatus && <p style={{ marginTop: '15px', textAlign: 'center', fontWeight: 'bold', color: authStatus.includes('✅') ? '#2ecc71' : '#e74c3c' }}>{authStatus}</p>}
        </div>
      )}

      {/* 4. ZAVIHEK: NALAGANJE NOVE OBJAVE */}
      {aktivniZavihek === 'nalaganje' && token && (
        <div style={{ background: '#2c3e50', padding: '20px', borderRadius: '8px' }}>
          <h2 style={{ color: '#fff' }}>Naloži novo astrofotografijo</h2>
          <form onSubmit={oddajObjavo} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Naslov slike (npr. Meglica Orion)" required value={naslov} onChange={(e) => setNaslov(e.target.value)} style={{ padding: '10px', fontSize: '16px' }} />
            <textarea placeholder="Kratek opis fotografije..." value={opis} onChange={(e) => setOpis(e.target.value)} style={{ padding: '10px', fontSize: '16px', minHeight: '80px' }} />
            
            <fieldset style={{ border: '1px solid #34495e', padding: '15px', borderRadius: '5px' }}>
              <legend style={{ color: '#3498db' }}>Tehnični metapodatki</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="Teleskop / Objektiv" value={teleskop} onChange={(e) => setTeleskop(e.target.value)} style={{ padding: '8px' }} />
                <input type="text" placeholder="Kamera" value={kamera} onChange={(e) => setKamera(e.target.value)} style={{ padding: '8px' }} />
                <input type="text" placeholder="Montaža" value={montaza} onChange={(e) => setMontaza(e.target.value)} style={{ padding: '8px' }} />
                <input type="text" placeholder="Čas ekspozicije (npr. 4h 15m)" value={ekspozicija} onChange={(e) => setEkspozicija(e.target.value)} style={{ padding: '8px' }} />
              </div>
            </fieldset>

            <input type="file" accept="image/*" onChange={(e) => setSlika(e.target.files[0])} style={{ padding: '10px', background: '#34495e', border: '1px solid #2c3e50' }} />
            <button type="submit" style={{ padding: '15px', fontSize: '16px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Objavi v galerijo</button>
            {status && <p style={{ marginTop: '10px', fontWeight: 'bold', color: status.includes('✅') ? '#2ecc71' : '#e74c3c' }}>{status}</p>}
          </form>
        </div>
      )}

      {/* --- NOVO: Modal za povečavo slike (prikazan le, ko povečanaSlikaUrl ni null) --- */}
      {povečanaSlikaUrl && (
        <div style={modalOverlayStyle} onClick={handleZapriPovečavo}>
          <img src={povečanaSlikaUrl} alt="Povečana astro" style={largeImageStyle} />
        </div>
      )}

    </div>
  )
}

export default App