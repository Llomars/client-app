import { useState } from 'react';

export default function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    tel: '',
    adresse: '',
    codePostal: '',
    ville: '',
    montantFacture: '',
    frequenceFacture: 'mensuel',
    commercial: '',
    professionMr: '',
    professionMme: '',
    ageMr: '',
    ageMme: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addClient = (e) => {
    e.preventDefault();
    setClients([...clients, form]);
    setForm({
      nom: '',
      prenom: '',
      email: '',
      tel: '',
      adresse: '',
      codePostal: '',
      ville: '',
      montantFacture: '',
      frequenceFacture: 'mensuel',
      commercial: '',
      professionMr: '',
      professionMme: '',
      ageMr: '',
      ageMme: '',
    });
  };

  return (
    <div>
      <h2>Ajouter un Client</h2>
      <form onSubmit={addClient} style={{ marginBottom: '30px' }}>
        {[
          ['nom', 'Nom'],
          ['prenom', 'Prénom'],
          ['email', 'Adresse Mail'],
          ['tel', 'Numéro de tél'],
          ['adresse', 'Adresse du domicile'],
          ['codePostal', 'Code Postal'],
          ['ville', 'Ville'],
          ['montantFacture', 'Montant de la facture EDF'],
          ['commercial', 'Nom du Commercial'],
          ['professionMr', 'Profession Mr'],
          ['professionMme', 'Profession Mme'],
          ['ageMr', 'Age Mr'],
          ['ageMme', 'Age Mme'],
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

        <div>
          <label>Fréquence Facture : </label>
          <select
            name="frequenceFacture"
            value={form.frequenceFacture}
            onChange={handleChange}
            style={{ margin: '5px', padding: '8px' }}
          >
            <option value="mensuel">Mensuel</option>
            <option value="bimestriel">Tous les 2 mois</option>
            <option value="annuel">Annuel</option>
          </select>
        </div>

        <button
          type="submit"
          style={{ padding: '10px 20px', marginTop: '10px' }}
        >
          Ajouter
        </button>
      </form>

      <h2>Liste des Clients</h2>
      <table border="1" cellPadding="8" style={{ margin: 'auto' }}>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email</th>
            <th>Tél</th>
            <th>Adresse</th>
            <th>CP</th>
            <th>Ville</th>
            <th>Montant</th>
            <th>Fréquence</th>
            <th>Commercial</th>
            <th>Profession Mr</th>
            <th>Profession Mme</th>
            <th>Age Mr</th>
            <th>Age Mme</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => (
            <tr key={i}>
              <td>{c.nom}</td>
              <td>{c.prenom}</td>
              <td>{c.email}</td>
              <td>{c.tel}</td>
              <td>{c.adresse}</td>
              <td>{c.codePostal}</td>
              <td>{c.ville}</td>
              <td>{c.montantFacture}</td>
              <td>{c.frequenceFacture}</td>
              <td>{c.commercial}</td>
              <td>{c.professionMr}</td>
              <td>{c.professionMme}</td>
              <td>{c.ageMr}</td>
              <td>{c.ageMme}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
