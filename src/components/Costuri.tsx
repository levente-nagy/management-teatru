import React, { useEffect, useState } from 'react';
import { db } from '../Firebase';
import { collection, getDocs, doc, getDoc, query } from 'firebase/firestore'; 
import { Input, Table, message, Typography } from 'antd'; 


interface Artist {
    id: string;
    nume: string;
    prenume: string;
    tip_contract: 'Angajat' | 'Colaborator';
    salariu_brut?: number;
    salariu_net?: number;
    impozite?: number;
}

interface Spectacol {
    id: string;
    titlu: string;
    data: string; 
    colaboratori: { id: string; plata: number }[];
}

interface CosturiProps {
    userId: string;
    userRole: string;
}

const Costuri: React.FC<CosturiProps> = ({ userId, userRole }) => {
    const [spectacole, setSpectacole] = useState<Spectacol[]>([]);
    const [colaboratorNames, setColaboratorNames] = useState<{ [key: string]: string }>({});
    const [loadingSpectacole, setLoadingSpectacole] = useState(false);
    const [angajati, setAngajati] = useState<Artist[]>([]);
    const [loadingAngajati, setLoadingAngajati] = useState(false);
    const [searchTermAngajati, setSearchTermAngajati] = useState('');
    const [searchTermSpectacole, setSearchTermSpectacole] = useState('');


    const canView = userRole === 'Administrator' || userRole === 'Resurse umane';

    const fetchArtistiData = async () => {
        if (!userId || !canView) {
            setAngajati([]);
            return;
        }
        setLoadingAngajati(true);
        try {
            const artistiCollection = collection(db, 'artisti');
            const querySnapshot = await getDocs(artistiCollection);
            const fetchedArtisti = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as Artist));

            const filteredAngajati = fetchedArtisti.filter(artist => artist.tip_contract === 'Angajat');
            setAngajati(filteredAngajati);

        } catch (error) {
            console.error('Error fetching artisti:', error);
            message.error('Eroare la preluarea datelor artiștilor.');
        } finally {
            setLoadingAngajati(false);
        }
    };


    const fetchSpectacoleData = async () => { 
        if (!userId || !canView) {
            setSpectacole([]);
            return;
        };
        setLoadingSpectacole(true);
        try {
            const userSpectacoleCollection = collection(db, 'spectacole');
            const q = query(userSpectacoleCollection); 
            const querySnapshot = await getDocs(q);
            const fetchedData = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    titlu: data.titlu,
                    data: data.data, 
                    colaboratori: data.colaboratori || [],
                };
            });
            const spectacoleCuColaboratori = fetchedData.filter(spectacol => spectacol.colaboratori && spectacol.colaboratori.length > 0);
            setSpectacole(spectacoleCuColaboratori);
            fetchColaboratorNames(spectacoleCuColaboratori);
        } catch (error) {
            console.error('Error fetching spectacole:', error);
            message.error('Eroare la preluarea spectacolelor.');
        } finally {
            setLoadingSpectacole(false);
        }
    };

    const fetchColaboratorNames = async (spectacoleData: Spectacol[]) => {
        if (!userId || !canView) return;
        try {
            const colaboratorIds = new Set<string>();
            spectacoleData.forEach((spectacol) => {
                (spectacol.colaboratori || []).forEach((colaborator) => {
                    if (colaborator && colaborator.id) {
                        colaboratorIds.add(colaborator.id);
                    }
                });
            });

            const names: { [key: string]: string } = {};
            await Promise.all(Array.from(colaboratorIds).map(async (id) => {
                if (!id) return;
                if (colaboratorNames[id]) {
                    names[id] = colaboratorNames[id];
                    return;
                }
                try {
                    const colaboratorDocRef = doc(db, 'artisti', id);
                    const colaboratorDoc = await getDoc(colaboratorDocRef);
                    if (colaboratorDoc.exists()) {
                        names[id] = `${colaboratorDoc.data().nume} ${colaboratorDoc.data().prenume}`;
                    } else {
                        names[id] = `ID Șters/Necunoscut: ${id}`;
                    }
                } catch (innerError) {
                    console.error(`Error fetching name for ID ${id}:`, innerError);
                    names[id] = `Eroare Preluare ID: ${id}`;
                }
            }));
            setColaboratorNames(prevNames => ({ ...prevNames, ...names }));
        } catch (error) {
            console.error('Error fetching colaborator names:', error);
            message.error('Eroare la preluarea numelor colaboratorilor.');
        }
    };

    useEffect(() => {
        if (userId && canView) {
            fetchArtistiData();
            fetchSpectacoleData(); 
        } else {
            setSpectacole([]);
            setColaboratorNames({});
            setAngajati([]);
        }
    }, [userId, userRole]); 

    const renderColaboratorPayments = (colaboratori: { id: string; plata: number }[]) => {
        if (!colaboratori || colaboratori.length === 0) {
            return <li>-</li>;
        }
        return colaboratori.map((colaborator) => (
          <li key={colaborator.id}>
            {colaboratorNames[colaborator.id] || `ID: ${colaborator.id}`}: {colaborator.plata || 0} lei
          </li>
        ));
      };

      const calculateTotalCosturiColaboratori = (data: Spectacol[]) => {
        let totalCost = 0;
        data.forEach((spectacol) => {
          totalCost += calculateTotalCosturiPerShow(spectacol.colaboratori);
        });
        return totalCost;
      };

      const calculateTotalSalariiAngajati = (data: Artist[]) => {
        return data.reduce((total, angajat) => total + (angajat.salariu_brut ?? 0), 0);
      };

      const calculateTotalCosturiPerShow = (colaboratori: { id: string; plata: number }[]) => {
        if (!colaboratori) return 0;
        return colaboratori.reduce((total, colaborator) => total + (colaborator.plata || 0), 0);
      };


    if (!canView) {
        return <Typography.Text>Nu aveți permisiunea de a vizualiza această secțiune.</Typography.Text>;
    }

    const filteredAngajati = angajati.filter(angajat => 
        angajat.nume.toLowerCase().includes(searchTermAngajati.toLowerCase()) ||
        angajat.prenume.toLowerCase().includes(searchTermAngajati.toLowerCase())
    );

    const filteredSpectacole = spectacole.filter(spectacol =>
        spectacol.titlu.toLowerCase().includes(searchTermSpectacole.toLowerCase())
    );

    const totalSalariiCalculat = calculateTotalSalariiAngajati(filteredAngajati);
    const totalColaboratoriCalculat = calculateTotalCosturiColaboratori(filteredSpectacole);

    const angajatiColumns = [
        { title: 'Nume', dataIndex: 'nume', key: 'nume',  sorter: (a: Artist, b: Artist) => a.nume.localeCompare(b.nume), defaultSortOrder: 'ascend' as const, width: 100 },
        { title: 'Prenume', dataIndex: 'prenume', key: 'prenume', width: 100 },
        { title: 'Salariu net (lei)', dataIndex: 'salariu_net', key: 'salariu_net', render: (salariu: number | undefined) => salariu ?? '-', width: 50 },
        { title: 'Impozite (lei)', dataIndex: 'impozite', key: 'impozite', render: (impozit: number | undefined) => impozit ?? '-', width: 50 },
        { title: 'Salariu brut (lei)', dataIndex: 'salariu_brut', key: 'salariu_brut', align: 'right' as const, render: (salariu: number | undefined) => salariu ?? '-', width: 50},
    ];

    const spectacoleColumns = [
        { title: 'Spectacol', dataIndex: 'titlu', key: 'titlu',  sorter: (a: Spectacol, b: Spectacol) => a.titlu.localeCompare(b.titlu), defaultSortOrder: 'ascend' as const, width: 150},
        { title: 'Data', dataIndex: 'data', key: 'data', width: 150  }, 
        {
            title: 'Costuri colaboratori', 
            dataIndex: 'colaboratori',
            key: 'costuriColaboratori',
            render: (colaboratori: { id: string; plata: number }[]) => (
                <ul style={{ paddingLeft: 0, listStyle: 'none', textAlign: 'left', display: 'inline-block', margin: 0 }}>
                    {renderColaboratorPayments(colaboratori)}
                </ul>
            ),
        },
        {
            title: 'Per spectacol  (lei)', 
            dataIndex: 'colaboratori',
            key: 'totalCosturiColaboratori',
            align: 'right' as const,
            render: (colaboratori: { id: string; plata: number }[]) => `${calculateTotalCosturiPerShow(colaboratori)}`,
        },
    ];


    return (
        <div>
            <div style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 10, 
                backgroundColor: 'white', 
                padding: '10px 0', 
                borderBottom: '1px solid #f0f0f0',
                textAlign: 'right' 
            }}>
                <Typography.Title level={3} style={{ margin: 0 }}> 
                    Total costuri: {(totalSalariiCalculat + totalColaboratoriCalculat)} lei
                </Typography.Title>
            </div>

            <Typography.Title level={5} style={{ marginTop: 24, marginBottom:24 }}>Salarii angajați</Typography.Title>
            <Input.Search
                placeholder="Căutare după nume/prenume"
                allowClear
                onChange={(e) => setSearchTermAngajati(e.target.value)}
                onSearch={(value) => setSearchTermAngajati(value)}
                style={{ marginBottom: 24, width: 300 }}
            />
            <Table
                dataSource={filteredAngajati}
                columns={angajatiColumns}
                loading={loadingAngajati}
                rowKey="id"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                size="small"
                scroll={{ x: 'max-content' }}
                footer={() => (
                    <div style={{ textAlign: 'right'}}>
                        <Typography.Text strong>Total salarii brute: {totalSalariiCalculat} lei</Typography.Text>
                    </div>
                )}
            />

            <Typography.Title level={5} style={{ marginTop: 24, marginBottom:24 }}>Costuri colaboratori per spectacol</Typography.Title>
   
            <Input.Search
                placeholder="Cautare după titlu spectacol"
                allowClear
                onChange={(e) => setSearchTermSpectacole(e.target.value)}
                onSearch={(value) => setSearchTermSpectacole(value)}
                style={{ marginBottom: 24, width: 300 }}
            />
            <Table
                dataSource={filteredSpectacole}
                loading={loadingSpectacole}
                columns={spectacoleColumns}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                footer={() => (
                    <div style={{ textAlign: 'right' }}>
                        <Typography.Text strong>Total costuri colaboratori: {totalColaboratoriCalculat} lei</Typography.Text>
                    </div>
                )}
            />
        </div>
    );
};

export default Costuri;