import { useState, useEffect } from 'react'

function App() {
  const [aktivniZavihek, setAktivniZavihek] = useState('galerija')
  const [izbranaObjava, setIzbranaObjava] = useState(null)
  const [novKomentar, setNovKomentar] = useState('')
  
  // Stanja za obrazec
  const [naslov, setNaslov] = useState('')
  const [opis, setOpis] = useState('')
  const [teleskop, setTeleskop] = useState('')
  const [kamera, setKamera] = useState('')
  const [montaza, setMontaza] = useState('')
  const [ekspozicija, setEkspozicija] = useState('')
  const [slika, setSlika] = useState(null)
  const [status, setStatus] = useState('')

  const [galerija, setGalerija] = useState([])

  const osveziGalerijo = () => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setGalerija(data)
        if (izbranaObjava) {
          const osvezena = data.find(o => o.post_id === izbranaObjava.post_id)
          if (osvezena) setIzbranaObjava(osvezena)
        }
      })
      .catch(err => console.error(err))
  }

  useEffect(() => {
    if (aktivniZavihek === 'galerija') {
      osveziGalerijo()
      setIzbranaObjava(null)
    }
  }, [aktivniZavihek])

  const odpriObjavo = (objava) => {
    setIzbranaObjava(objava)
    setAktivniZavihek('objava')
  }

  const oddajObjavo = async (e) => {
    e.preventDefault()
    if (!slika) return setStatus('❌ Prosim, izberi sliko!')
    setStatus('⏳ Ustvarjam objavo in nalagam na S3...')
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
    if (!novKomentar.trim()) return
    await fetch(`/api/posts/${izbranaObjava.post_id}/komentarji`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ besedilo: novKomentar })
    })
    setNovKomentar('')
    osveziGalerijo()
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px', color: '#ecf0f1' }}>
      
      <style>{`body { background-color: #1a1e24; margin: 0; } input, textarea { background: #2c3e50; color: white; border: 1px solid #34495e; border-radius: 4px; }`}</style>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #34495e', paddingBottom: '10px', marginBottom: '20px' }}>
        {/* NOVO: Klik na logo te vrne na začetno stran galerije */}
        <h1 
          onClick={() => setAktivniZavihek('galerija')} 
          style={{ margin: 0, color: '#3498db', cursor: 'pointer', userSelect: 'none' }}>
          🌌 DarkFrame
        </h1>
        <nav>
          <button onClick={() => setAktivniZavihek('galerija')} style={{ marginRight: '10px', padding: '10px 20px', cursor: 'pointer', background: aktivniZavihek === 'galerija' ? '#3498db' : '#2c3e50', color: 'white', border: 'none', borderRadius: '5px' }}>Galerija</button>
          <button onClick={() => setAktivniZavihek('nalaganje')} style={{ padding: '10px 20px', cursor: 'pointer', background: aktivniZavihek === 'nalaganje' ? '#3498db' : '#2c3e50', color: 'white', border: 'none', borderRadius: '5px' }}>Nova Objava</button>
        </nav>
      </header>

      {/* 1. GALERIJA (Thumbnails) */}
      {aktivniZavihek === 'galerija' && (
        <div>
          <h2 style={{ color: '#fff' }}>Nedavne objave</h2>
          {galerija.length === 0 ? <p style={{ color: '#7f8c8d' }}>Galerija je prazna. Naloži prvo sliko!</p> : (
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
              {galerija.map((objava, i) => (
                <div key={i} onClick={() => odpriObjavo(objava)} style={{ border: '1px solid #34495e', padding: '15px', borderRadius: '8px', background: '#2c3e50', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {objava.s3_kljuc ? (
                    /* NOVO: Tukaj nalagamo pomanjšano različico slike (/thumbnail) za bliskovito delovanje */
                    <img src={`/api/posts/${objava.post_id}/thumbnail`} alt={objava.naslov} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#000' }} />
                  ) : <div style={{ height: '220px', backgroundColor: '#000', borderRadius: '4px' }}>Ni slike</div>}
                  <h3 style={{ margin: '15px 0 5px 0', color: '#ecf0f1' }}>{objava.naslov}</h3>
                  <p style={{ color: '#bdc3c7', fontSize: '14px', margin: 0 }}>🔭 {objava.oprema.teleskop} | ⏱️ {objava.oprema.cas_ekspozicije}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. PODROBNOSTI OBJAVE IN KOMENTARJI */}
      {aktivniZavihek === 'objava' && izbranaObjava && (
        <div style={{ background: '#2c3e50', padding: '20px', borderRadius: '8px' }}>
          <button onClick={() => setAktivniZavihek('galerija')} style={{ background: 'transparent', color: '#3498db', border: 'none', cursor: 'pointer', padding: 0, fontSize: '16px', marginBottom: '15px' }}>← Nazaj v galerijo</button>
          
          <h2 style={{ marginTop: 0, color: '#fff' }}>{izbranaObjava.naslov}</h2>
          {izbranaObjava.s3_kljuc && (
            /* Tukaj pa se naloži POLNA slika v visoki resoluciji (/slika) */
            <img src={`/api/posts/${izbranaObjava.post_id}/slika`} alt="Astro" style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '8px', marginBottom: '15px' }} />
          )}
          <p style={{ fontSize: '16px', color: '#ecf0f1' }}>{izbranaObjava.opis}</p>
          
          <div style={{ background: '#34495e', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Tehnični podatki</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#bdc3c7' }}>
              <li><strong>Teleskop:</strong> {izbranaObjava.oprema.teleskop}</li>
              <li><strong>Kamera:</strong> {izbranaObjava.oprema.kamera}</li>
              <li><strong>Montaža:</strong> {izbranaObjava.oprema.montaza}</li>
              <li><strong>Ekspozicija:</strong> {izbranaObjava.oprema.cas_ekspozicije}</li>
            </ul>
          </div>

          <hr style={{ borderColor: '#34495e', margin: '30px 0' }} />
          
          <h3>Komentarji ({izbranaObjava.komentarji.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {izbranaObjava.komentarji.map((kom, i) => (
              <div key={i} style={{ background: '#1a1e24', padding: '10px 15px', borderRadius: '5px' }}>
                <strong style={{ color: '#3498db' }}>{kom.avtor}</strong>
                <p style={{ margin: '5px 0 0 0', color: '#bdc3c7' }}>{kom.besedilo}</p>
              </div>
            ))}
          </div>

          <form onSubmit={oddajKomentar} style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={novKomentar} onChange={(e) => setNovKomentar(e.target.value)} placeholder="Dodaj komentar..." style={{ flex: 1, padding: '10px' }} required />
            <button type="submit" style={{ padding: '10px 20px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pošlji</button>
          </form>
        </div>
      )}

      {/* 3. NALAGANJE NOVE OBJAVE */}
      {aktivniZavihek === 'nalaganje' && (
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

    </div>
  )
}

export default App