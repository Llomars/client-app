import { useState } from 'react';

export default function ParrainagesTab() {
  const [parrainages, setParrainages] = useState([]);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    tel: '',
    email: '',
    ville: '',
    commercial: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addParrainage = (e) => {
    e.preventDefault();
    setParrainages([...parrainages, form]);
    setForm({
      nom: '',
      prenom: '',
      tel: '',
      email: '',
      ville: '',
      commercial: '',
    });
  };

  return (
    <div>
      <h2>Ajouter un Parrainage</h2>
      <form onSubmit={addParrainage} style={{ marginBottom: '30px' }}>
        {[
          ['nom', 'Nom'],
          ['prenom', 'Prénom'],
          ['tel', 'Numéro de tél'],
          ['email', 'Adresse Mail'],
          ['ville', 'Ville'],
          ['commercial', 'Nom du Commercial'],
        ].map(([name, label]) => (
          <div key={name}>
            <input
              name={name}
              value={form[name]}
              onChange={handleChange}
              placeholder={label}
              required
              style={{ margin: '5px', padding: '8px', width: '300px' }}
            />
          </div>
        ))}

        <button
          type="submit"
          style={{ padding: '10px 20px', marginTop: '10px' }}
        >
          Ajouter
        </button>
      </form>

      <h2>Liste des Parrainages</h2>
      <table border="1" cellPadding="8" style={{ margin: 'auto' }}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Tél</th>
            <th>Email</th>
            <th>Ville</th>
            <th>Commercial</th>
          </tr>
        </thead>
        <tbody>
          {parrainages.map((p, i) => (
            <tr key={i}>
              <td>{p.nom}</td>
              <td>{p.prenom}</td>
              <td>{p.tel}</td>
              <td>{p.email}</td>
              <td>{p.ville}</td>
              <td>{p.commercial}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
