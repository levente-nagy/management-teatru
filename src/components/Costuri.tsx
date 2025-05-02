import React, { useEffect, useState } from 'react';
import { db } from '../Firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { Button, DatePicker, Space, Table, message, Typography } from 'antd';
import dayjs from 'dayjs';

interface Artist {
    id: string;
    nume: string;
    prenume: string;
    tip_contract: 'Angajat' | 'Colaborator';
    salariu_net?: number;
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
    const [selectedDataDates, setSelectedDataDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [loadingSpectacole, setLoadingSpectacole] = useState(false);
    const [angajati, setAngajati] = useState<Artist[]>([]);
    const [loadingAngajati, setLoadingAngajati] = useState(false);

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


    const fetchSpectacoleData = async (startDate?: string, endDate?: string) => {
        if (!userId || !canView) {
            setSpectacole([]);
            return;
        };
        setLoadingSpectacole(true);
        try {
            const userSpectacoleCollection = collection(db, 'spectacole');
            let q;
            if (startDate && endDate) {
                q = query(
                    userSpectacoleCollection,
                    where('data', '>=', startDate),
                    where('data', '<=', endDate)
                );
            } else {
                q = query(userSpectacoleCollection);
            }
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
            if ((error as any).code === 'failed-precondition') {
                message.error('Index Firestore necesar pentru filtrarea după dată. Verificați consola Firebase.');
            } else {
                message.error('Eroare la preluarea spectacolelor.');
            }
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

      const calculateTotalCosturiColaboratori = () => {
        let totalCost = 0;
        spectacole.forEach((spectacol) => {
          totalCost += calculateTotalCosturiPerShow(spectacol.colaboratori);
        });
        return totalCost;
      };

      const calculateTotalSalariiAngajati = () => {
        return angajati.reduce((total, angajat) => total + (angajat.salariu_net ?? 0), 0);
      };

      const calculateTotalCosturiPerShow = (colaboratori: { id: string; plata: number }[]) => {
        if (!colaboratori) return 0;
        return colaboratori.reduce((total, colaborator) => total + (colaborator.plata || 0), 0);
      };

      const handleDataSearch = () => {
        if (selectedDataDates) {
          const [startDate, endDate] = selectedDataDates;
          fetchSpectacoleData(startDate.format('DD-MM-YYYY'), endDate.format('DD-MM-YYYY'));
        } else {
          message.info('Selectați un interval de date pentru căutare.');
        }
      };

      const handleDataResetFilters = () => {
        setSelectedDataDates(null);
        fetchSpectacoleData();
      };


    if (!canView) {
        return <Typography.Text>Nu aveți permisiunea de a vizualiza această secțiune.</Typography.Text>;
    }

    const angajatiColumns = [
        { title: 'Nume', dataIndex: 'nume', key: 'nume', sorter: (a: Artist, b: Artist) => a.nume.localeCompare(b.nume), defaultSortOrder: 'ascend' as const },
        { title: 'Prenume', dataIndex: 'prenume', key: 'prenume' },
        { title: 'Salariu net (lei)', dataIndex: 'salariu_net', key: 'salariu_net', align: 'right' as const, render: (salariu: number | undefined) => salariu ?? '-', sorter: (a: Artist, b: Artist) => (a.salariu_net ?? 0) - (b.salariu_net ?? 0) },
    ];

    const spectacoleColumns = [
        { title: 'Spectacol', dataIndex: 'titlu', key: 'titlu',  sorter: (a: Spectacol, b: Spectacol) => a.titlu.localeCompare(b.titlu), defaultSortOrder: 'ascend' as const},
        { title: 'Data', dataIndex: 'data', key: 'data'  },
        {
            title: 'Costuri colaboratori',
            dataIndex: 'colaboratori',
            render: (colaboratori: { id: string; plata: number }[]) => (
                <ul style={{ paddingLeft: 0, listStyle: 'none', textAlign: 'left', display: 'inline-block', margin: 0 }}>
                    {renderColaboratorPayments(colaboratori)}
                </ul>
            ),
        },
        {
            title: 'Total per spectacol (lei)',
            dataIndex: 'colaboratori',
            key: 'totalCosturi',
            align: 'right' as const,
            render: (colaboratori: { id: string; plata: number }[]) => `${calculateTotalCosturiPerShow(colaboratori)} lei`,
        },
    ];


    return (
        <div>
            <Typography.Title level={4}>Salarii angajați</Typography.Title>
            <Table
                dataSource={angajati}
                columns={angajatiColumns}
                loading={loadingAngajati}
                rowKey="id"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                size="small"
                scroll={{ x: 'max-content' }}
                footer={() => (
                    <div style={{ textAlign: 'right' }}>
                        <Typography.Text strong>Total salarii: {calculateTotalSalariiAngajati()} lei</Typography.Text>
                    </div>
                )}
            />

            <Typography.Title level={4} style={{ marginTop: 24 }}>Costuri colaboratori</Typography.Title>
            <Space direction="horizontal" size={15} style={{ marginBottom: 16 }}>
                <DatePicker.RangePicker
                    format="DD-MM-YYYY"
                    value={selectedDataDates}
                    onChange={(dates) => setSelectedDataDates(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                />
                <Button onClick={handleDataSearch} disabled={!selectedDataDates}>
                    Căutare
                </Button>
                <Button onClick={handleDataResetFilters}>
                    Resetare
                </Button>
            </Space>
            <Table
                dataSource={spectacole}
                loading={loadingSpectacole}
                columns={spectacoleColumns}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                footer={() => (
                    <div style={{ textAlign: 'right' }}>
                        <Typography.Text strong>Total costuri: {calculateTotalCosturiColaboratori()} lei</Typography.Text>
                    </div>
                )}
            />
			<br />
			<br />
			<div style={{ textAlign: 'right' }}>
				<Typography.Text strong>Total cheltuieli: {calculateTotalSalariiAngajati() + calculateTotalCosturiColaboratori()} lei</Typography.Text>
			</div>
        </div>
    );
};

export default Costuri;
