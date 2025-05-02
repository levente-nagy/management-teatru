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
    try {
      let querySnapshot;
      if (startDate && endDate) {
        const q = query(
          collection(db, 'spectacole'),
          where('data', '>=', startDate),
          where('data', '<=', endDate)
        );
        querySnapshot = await getDocs(q);
      } else {
        querySnapshot = await getDocs(collection(db, 'spectacole'));
      }
      const fetchedData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          titlu: data.titlu,
          data: data.data,
          colaboratori: data.colaboratori || [],
        };
      });
      setSpectacole(fetchedData);
    } catch (error) {
      console.error('Error fetching spectacole:', error);
    }
  };

  const fetchColaboratorPayments = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'spectacole'));
      const paymentsData = querySnapshot.docs.map((doc) => ({
        spectacolId: doc.id,
        colaboratori: doc.data().colaboratori || [],
      }));
      setColaboratorPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching colaborator payments:', error);
    }
  };

  const fetchColaboratorNames = async () => {
    try {
      const colaboratorIds = new Set<string>();
      colaboratorPayments.forEach((spectacol) => {
        spectacol.colaboratori.forEach((colaborator) => {
          colaboratorIds.add(colaborator.id);
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

  const calculateTotalCosturi = () => {
    let totalCost = 0;
    spectacole.forEach((spectacol) => {
      totalCost += calculateTotalCosturiPerShow(spectacol.colaboratori);
    });
    return totalCost;
  };

  const calculateTotalCosturiPerShow = (colaboratori: any[]) => {
    return colaboratori.reduce((total, colaborator) => total + colaborator.plata, 0);
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
    fetchColaboratorPayments();
    fetchColaboratorNames();
  };

  return (
    <div>
      <br />
      <Space direction="horizontal" size={15}>
        <DatePicker.RangePicker
          format="DD-MM-YYYY"
          onChange={(dates) => setSelectedDataDates(dates)}
          value={selectedDataDates}
        />
        <Button onClick={handleDataSearch}>
          Căutare
        </Button>

        <Button onClick={handleDataResetFilters}>
          Resetare
        </Button>
      </Space>
      <br /><br />
      <Table
        dataSource={spectacole}
        columns={[
          { title: 'Spectacol', dataIndex: 'titlu', key: 'titlu', align: 'center', },
          { title: 'Data', dataIndex: 'data', key: 'data', align: 'center', },
          {
            title: 'Costuri',
            dataIndex: 'colaboratori',
            align: 'center',
            render: (colaboratori) => (
              <ul className="colaborator-list">
                {renderColaboratorPayments(colaboratori)}
              </ul>
            ),
          },
          {
            title: 'Total',
            dataIndex: 'colaboratori',
            key: 'totalCosturi',
            align: 'center',
            render: (colaboratori) => `${calculateTotalCosturiPerShow(colaboratori)} lei`,
          },
        ]}
        pagination={false}
        rowKey="id"
        footer={() => (
          <div style={{ textAlign: 'right' }}>
            Total costuri: {calculateTotalCosturi()} lei
          </div>
        )}
      />
    </div>
  );
};

export default Costuri;