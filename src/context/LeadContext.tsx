import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, where, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface Lead {
  id: string;
  category: string;
  equipmentTypes: string[];
  rentalDuration: string;
  startDate: string;
  budget: string;
  street: string;
  city: string;
  zipCode: string;
  name: string;
  email: string;
  phone: string;
  details: string;
  status: 'New' | 'Purchased';
  createdAt: string;
  purchasedBy: string | null;
  purchasedAt?: string;
  leadStatus?: string;
}

interface LeadContextType {
  leads: Lead[];
  loading: boolean;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'purchasedBy' | 'status'>) => Promise<void>;
  purchaseLead: (leadId: string) => Promise<void>;
  updateLeadStatus: (leadId: string, status: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export function LeadProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let q;
    
    if (user) {
      // Users see unpurchased leads and their purchased leads
      q = query(
        collection(db, 'leads'),
        where('status', 'in', ['New', 'Purchased']),
        where('purchasedBy', 'in', [null, user.id])
      );
    } else {
      // Non-authenticated users only see unpurchased leads
      q = query(
        collection(db, 'leads'),
        where('status', '==', 'New')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'purchasedBy' | 'status'>) => {
    try {
      await addDoc(collection(db, 'leads'), {
        ...leadData,
        status: 'New',
        createdAt: Timestamp.now().toDate().toISOString(),
        purchasedBy: null
      });
    } catch (error) {
      console.error('Error adding lead:', error);
      throw error;
    }
  };

  const purchaseLead = async (leadId: string) => {
    if (!user) throw new Error('Must be logged in to purchase leads');
    
    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (!leadDoc.exists()) {
        throw new Error('Lead not found');
      }
      
      const leadData = leadDoc.data();
      if (leadData.status === 'Purchased') {
        throw new Error('This lead has already been purchased');
      }

      await updateDoc(leadRef, {
        status: 'Purchased',
        purchasedBy: user.id,
        purchasedAt: Timestamp.now().toDate().toISOString(),
        leadStatus: 'New'
      });
    } catch (error) {
      console.error('Error purchasing lead:', error);
      throw error;
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    if (!user) throw new Error('Must be logged in to update lead status');

    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (!leadDoc.exists()) {
        throw new Error('Lead not found');
      }
      
      const leadData = leadDoc.data();
      if (leadData.purchasedBy !== user.id) {
        throw new Error('You can only update leads you have purchased');
      }

      await updateDoc(leadRef, {
        leadStatus: status,
        updatedAt: Timestamp.now().toDate().toISOString()
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  };

  return (
    <LeadContext.Provider value={{ leads, loading, addLead, purchaseLead, updateLeadStatus }}>
      {children}
    </LeadContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}