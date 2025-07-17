import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Inventory.css';

function Inventory() {
  const [potions, setPotions] = useState([]);

  useEffect(() => {
    const fetchInventory = async () => {
      const user = auth.currentUser;
      const potionsRef = collection(db, 'inventory', user.uid, 'items');
      const snapshot = await getDocs(potionsRef);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPotions(items);
    };

    fetchInventory();
  }, []);

  const usePotion = async (potion) => {
    if (potion.used) return;

    const user = auth.currentUser;
    const potionRef = doc(db, 'inventory', user.uid, 'items', potion.id);
    await updateDoc(potionRef, { used: true });

    // Trigger XP boost logic here (increase XP, show animation, etc.)
    console.log('XP Potion used!');

    setPotions(prev =>
      prev.map(p => (p.id === potion.id ? { ...p, used: true } : p))
    );
  };

  return (
    <div className="inventory-container">
      <h2>Inventory</h2>
      <div className="inventory-grid">
        {potions.map((potion) => (
          <div
            key={potion.id}
            className={`potion-card ${potion.used ? 'used' : ''}`}
            onClick={() => usePotion(potion)}
          >
            🧪 {potion.name} {potion.used ? '(Used)' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;
