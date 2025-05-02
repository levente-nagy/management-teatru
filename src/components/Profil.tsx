import React, { useEffect, useState } from 'react';
import { db } from '../Firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore'; 
import { Descriptions, Spin, message, Typography, Table, Tag } from 'antd';
import dayjs from 'dayjs';

interface ArtistProfile {
    id: string;
    nume: string;
    prenume: string;
    email?: string; 
    CNP?: string;
    carte_identitate?: string;
    profesie: string;
    functie: string;
    tip_contract?: 'Angajat' | 'Colaborator';
    salariu_brut?: number;
    salariu_net?: number;
    impozite?: number;
    data_inceput_contract?: string;
    perioada_contract?: number;
}

interface SpectacolCost {
    key: string;
    titlu: string;
    data: string;
    plata: number;
}

interface ProfilProps {
    userEmail: string | null | undefined; 
}

const Profil: React.FC<ProfilProps> = ({ userEmail }) => {
    const [profile, setProfile] = useState<ArtistProfile | null>(null);
    const [collaboratorCosts, setCollaboratorCosts] = useState<SpectacolCost[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingCosts, setLoadingCosts] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {

            if (!userEmail) {
                setLoadingProfile(false);
                setProfile(null); 
                message.error('Adresa de email a utilizatorului nu este disponibilă.');
                return;
            }
            setLoadingProfile(true);
            try {
                
                const artistiCollection = collection(db, 'artisti');
                const q = query(artistiCollection, where("email", "==", userEmail), limit(1)); 
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                
                    const userDocSnap = querySnapshot.docs[0];
                    const data = userDocSnap.data() as Omit<ArtistProfile, 'id'>;
                    const userProfile: ArtistProfile = { id: userDocSnap.id, ...data };
                    setProfile(userProfile);

                    if (userProfile.tip_contract === 'Colaborator') {
                        fetchCollaboratorCosts(userProfile.id); 
                    }
                } else {

                    message.error(`Profilul artistului pentru email-ul ${userEmail} nu a fost găsit.`);
                    setProfile(null);
                }
            } catch (error) {
                console.error("Eroare la preluarea profilului după email:", error);
                message.error('Eroare la încărcarea profilului.');
                setProfile(null);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [userEmail]); 


    const fetchCollaboratorCosts = async (artistId: string) => {
        setLoadingCosts(true);
        try {
            const spectacoleCollection = collection(db, 'spectacole');
            const q = query(spectacoleCollection);
            const querySnapshot = await getDocs(q);

            const costs: SpectacolCost[] = [];
            querySnapshot.forEach((doc) => {
                const spectacolData = doc.data();
                const colaboratori = spectacolData.colaboratori as { id: string; plata: number }[] | undefined;

                if (colaboratori) {
                    const costEntry = colaboratori.find(c => c.id === artistId);
                    if (costEntry) {
                        costs.push({
                            key: doc.id,
                            titlu: spectacolData.titlu,
                            data: spectacolData.data,
                            plata: costEntry.plata || 0,
                        });
                    }
                }
            });

            costs.sort((a, b) => dayjs(b.data, 'DD-MM-YYYY').valueOf() - dayjs(a.data, 'DD-MM-YYYY').valueOf());
            setCollaboratorCosts(costs);

        } catch (error) {
            console.error("Eroare la preluarea costurilor colaboratorului:", error);
            message.error('Eroare la încărcarea costurilor de colaborare.');
        } finally {
            setLoadingCosts(false);
        }
    };

    if (loadingProfile) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}><Spin size="large" /></div>;
    }

    if (!profile) {
   
        return <Typography.Text>Profilul nu a putut fi încărcat sau nu există.</Typography.Text>;
    }


    const descriptionItems = [
        { key: '1', label: 'Nume', children: profile.nume },
        { key: '2', label: 'Prenume', children: profile.prenume },
        { key: '13', label: 'Email', children: profile.email || '-' }, 
        { key: '3', label: 'Profesie', children: profile.profesie },
        { key: '4', label: 'Funcție', children: profile.functie },
        { key: '5', label: 'Tip contract', children: <Tag color={profile.tip_contract === 'Angajat' ? 'blue' : 'green'}>{profile.tip_contract}</Tag> },
    ];

    if (profile.tip_contract === 'Angajat') {
        descriptionItems.push(
            { key: '6', label: 'CNP', children: profile.CNP || '-' },
            { key: '7', label: 'Carte identitate', children: profile.carte_identitate || '-' },
            { key: '8', label: 'Salariu brut', children: profile.salariu_brut ? `${profile.salariu_brut} lei` : '-' },
            { key: '9', label: 'Impozite', children: profile.impozite ? `${profile.impozite} lei` : '-' },
            { key: '10', label: 'Salariu net', children: profile.salariu_net ? `${profile.salariu_net} lei` : '-' },
            { key: '11', label: 'Data început contract', children: profile.data_inceput_contract || '-' },
            { key: '12', label: 'Perioadă contract', children: profile.perioada_contract ? `${profile.perioada_contract} luni` : '-' }
        );
    }

    const costColumns = [
        { title: 'Spectacol', dataIndex: 'titlu', key: 'titlu' },
        { title: 'Data', dataIndex: 'data', key: 'data', align: 'center' as const },
        { title: 'Plată (lei)', dataIndex: 'plata', key: 'plata', align: 'right' as const },
    ];

    return (
        <div>
            <Typography.Title level={4}>Profilul meu</Typography.Title>
            <Descriptions bordered column={1} size="small" items={descriptionItems} />

            {profile.tip_contract === 'Colaborator' && (
                <>
                    <Typography.Title level={4} style={{ marginTop: 24 }}>Istoric colaborări</Typography.Title>
                    <Table
                        columns={costColumns}
                        dataSource={collaboratorCosts}
                        loading={loadingCosts}
                        rowKey="key"
                        pagination={{ pageSize: 10, hideOnSinglePage: true }}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </>
            )}
        </div>
    );
};

export default Profil;