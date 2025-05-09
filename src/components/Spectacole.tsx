import React, { useEffect, useState } from 'react';
import { Button, Modal, Table, Form, Input, Space, DatePicker, TimePicker, Select, message, InputNumber, Popconfirm, Tooltip, Typography, Spin } from 'antd';
import type { TableProps } from 'antd';
import { db } from '../Firebase';
import { collection, addDoc, getDocs, where, query, updateDoc, doc, getDoc, deleteDoc, limit } from 'firebase/firestore';
import dayjs from 'dayjs';
import { EditOutlined, DeleteOutlined, QuestionCircleOutlined, EyeOutlined, DollarOutlined, TeamOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

interface Spectacol {
  key: string;
  titlu: string;
  data: string;
  ora: string;
  durata: string;
  actori: string[];
  colaboratori?: { id: string; plata: number }[];
}

interface BiletType {
  key: string;
  spectacol_id: string;
  categorie_bilet: string;
  nr_bilete: number;
  pret: number;
  bilete_vandute?: number;
  bilete_ramase?: number;
}

interface ActorOption {
  value: string;
  label: string;
}


interface SpectacoleProps {
  userId: string;
  userRole: string;
  userEmail?: string | null;
}

const Spectacole: React.FC<SpectacoleProps> = ({ userId, userRole, userEmail }) => {

  const [data, setData] = useState<Spectacol[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSpectacol, setEditingSpectacol] = useState<Spectacol | null>(null);
  const [form] = Form.useForm();
  const [actorData, setActorData] = useState<ActorOption[]>([]);
  const [colaboratorData, setColaboratorData] = useState<ActorOption[]>([]);
  const [isDistributieModalVisible, setIsDistributieModalVisible] = useState(false);
  const [isBileteModalVisible, setIsBileteModalVisible] = useState(false);
  const [isIncasariModalVisible, setIsIncasariModalVisible] = useState(false);
  const [selectedActori, setSelectedActors] = useState<string[]>([]);
  const [selectedColaboratori, setSelectedColaborators] = useState<string[]>([]);
  const [bilete, setBilete] = useState<BiletType[]>([]);
  const [selectedDataDates, setSelectedDataDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [ticketTableData, setTicketTableData] = useState<{ spectacol_id: string, categorie_bilet: string; total_bilete: number; bilete_vandute: number; bilete_ramase: number; pret: number }[]>([]);
  const [incasariData, setIncasariData] = useState<{ categorie_bilet: string, pret: number, total_earnings: number, bilete_vandute: number}[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [hasSelectedColaboratori, setHasSelectedColaboratori] = useState(false);
  const [colaboratorPayments, setColaboratorPayments] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [loadingArtistId, setLoadingArtistId] = useState(userRole === 'Artist');
  const [artistNotFound, setArtistNotFound] = useState(false);
  const [searchTermSpectacol, setSearchTermSpectacol] = useState('');

  const canView = userRole === 'Administrator' || userRole === 'Casier' || userRole === 'Coordonator' || userRole === 'Artist';
  const canAddEdit = userRole === 'Administrator' || userRole === 'Coordonator';
  const canDelete = userRole === 'Administrator';
  const canViewFinancials = userRole === 'Administrator' || userRole === 'Casier';
  const canEditTickets = userRole === 'Administrator' || userRole === 'Casier';

  const fetchArtistIdByEmail = async () => {
      if (userRole !== 'Artist' || !userEmail) {
          setArtistId(null);
          setLoadingArtistId(false);
          return;
      }

      setArtistNotFound(false);
      try {
          const artistiCollection = collection(db, 'artisti');
          const q = query(artistiCollection, where("email", "==", userEmail), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              const foundId = querySnapshot.docs[0].id;
              setArtistId(foundId);
          } else {
              setArtistId(null);
              setArtistNotFound(true);
          }
      } catch (error) {
          message.error("Eroare la identificarea artistului.");
          setArtistId(null);
          setArtistNotFound(true);
      } finally {
          setLoadingArtistId(false);
      }
  };

  const fetchActorData = async () => {
    if (!userId || !canAddEdit) return;
    try {
      const userActoriCollection = collection(db, 'artisti');
      const q = query(userActoriCollection, where('tip_contract', '==', 'Angajat'));
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map((doc) => ({
        value: doc.id,
        label: `${doc.data().nume} ${doc.data().prenume}`,
      }));
      setActorData(fetchedData);
    } catch (error) {
      message.error('Eroare la preluarea actorilor angajați.');
    }
  };

  const fetchColaboratorData = async () => {
    if (!userId || !canAddEdit) return;
    try {
      const userActoriCollection = collection(db, 'artisti');
      const q = query(userActoriCollection, where('tip_contract', '==', 'Colaborator'));
      const querySnapshot = await getDocs(q);
      const fetchedData = querySnapshot.docs.map((doc) => ({
        value: doc.id,
        label: `${doc.data().nume} ${doc.data().prenume}`,
      }));
      setColaboratorData(fetchedData);
    } catch (error) {
      message.error('Eroare la preluarea actorilor colaboratori.');
    }
  };

  const fetchSpectacolData = async (startDateOpt?: string, endDateOpt?: string, searchTitleOpt?: string) => {
    if (!userId || !canView || (userRole === 'Artist' && (loadingArtistId || artistNotFound))) {
        setData([]);
        if (userRole === 'Artist' && artistNotFound && !loadingArtistId) {
            message.warning("Nu s-au putut încărca spectacolele deoarece profilul artistului nu a fost găsit.");
        }
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
        const userSpectacoleCollection = collection(db, 'spectacole');
        let q;

        const startDate = startDateOpt;
        const endDate = endDateOpt;
        const currentSearchTitle = searchTitleOpt !== undefined ? searchTitleOpt : searchTermSpectacol;

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
        let fetchedData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                key: doc.id,
                titlu: data.titlu || '',
                data: data.data || '',
                ora: data.ora || '',
                durata: data.durata || '',
                actori: Array.isArray(data.actori)
                    ? data.actori.filter((id: any): id is string => typeof id === 'string')
                    : [],
                colaboratori: Array.isArray(data.colaboratori)
                    ? data.colaboratori.filter(
                          (colab: any): colab is { id: string; plata: number } =>
                              colab && typeof colab.id === 'string' && typeof colab.plata === 'number'
                      )
                    : [],
            } as Spectacol;
        });

        if (userRole === 'Artist' && artistId) {
            fetchedData = fetchedData.filter(spectacol => {
                const isAngajat = Array.isArray(spectacol.actori) && spectacol.actori.includes(artistId);
                const isColaborator = Array.isArray(spectacol.colaboratori) && spectacol.colaboratori.some((colab) => {
                    return colab?.id === artistId;
                });
                return isAngajat || isColaborator;
            });
        }

        if (currentSearchTitle && currentSearchTitle.trim() !== '') {
            const lowercasedSearchTitle = currentSearchTitle.trim().toLowerCase();
            fetchedData = fetchedData.filter(spectacol =>
                spectacol.titlu.toLowerCase().includes(lowercasedSearchTitle)
            );
        }

        setData(fetchedData);
    } catch (error) {
        if ((error as any).code === 'failed-precondition') {
            message.error('Index Firestore necesar pentru filtrarea după dată. Verificați consola Firebase.');
        } else {
            message.error('Eroare la preluarea spectacolelor.');
        }
        setData([]);
    } finally {
        setLoading(false);
    }
};

  const fetchBileteData = async () => {
    if (!userId || !canView) {
        setBilete([]);
        return;
    }
    try {
      const userBileteCollection = collection(db, 'bilete');
      const querySnapshot = await getDocs(query(userBileteCollection));
      const fetchedData = querySnapshot.docs.map((doc) => ({
        key: doc.id,
        ...(doc.data() as Omit<BiletType, 'key'>),
      })) as BiletType[];
      setBilete(fetchedData);
    } catch (error) {
      message.error('Eroare la preluarea biletelor.');
    }
  };

  useEffect(() => {
    if (userId && canView) {
        setLoadingArtistId(userRole === 'Artist');
        setArtistNotFound(false);
        setArtistId(null);

        if (userRole === 'Artist') {
            fetchArtistIdByEmail();
        } else {
            fetchSpectacolData(); 
        }
        fetchBileteData();
        if (canAddEdit) {
            fetchActorData();
            fetchColaboratorData();
        }
      } else {
          setData([]);
          setBilete([]);
          setActorData([]);
          setColaboratorData([]);
          setArtistId(null);
          setLoadingArtistId(false);
          setArtistNotFound(false);
      }
  }, [userId, userRole, userEmail]);

  useEffect(() => {
    if (userRole === 'Artist') {
        if (!loadingArtistId) {
            fetchSpectacolData(); 
        }
    }
}, [loadingArtistId, userRole, artistId]);

  useEffect(() => {
    if (isModalVisible && editingSpectacol) {
      const fields: any = {
        titlu: editingSpectacol.titlu,
        data: dayjs(editingSpectacol.data, 'DD-MM-YYYY'),
        ora: dayjs(editingSpectacol.ora, 'HH:mm'),
        durata: dayjs(editingSpectacol.durata, 'HH:mm'),
        actori: editingSpectacol.actori,
        colaboratori: editingSpectacol.colaboratori?.map(c => c.id) || [],
      };
      ;(editingSpectacol.colaboratori || []).forEach(colab => {
        fields[`plata_colaborator_${colab.id}`] = colab.plata;
      });
      form.setFieldsValue(fields);
    }
  }, [isModalVisible, editingSpectacol, form]);

  const handleColaboratoriChange = (selectedIds: string[]) => {
    setHasSelectedColaboratori(selectedIds.length > 0);
    setColaboratorPayments((prev) => {
      const updatedPayments = { ...prev };
      Object.keys(updatedPayments).forEach((key) => {
        if (!selectedIds.includes(key)) {
          delete updatedPayments[key];
        }
      });
      selectedIds.forEach(id => {
        if (!(id in updatedPayments)) {
          updatedPayments[id] = 0;
        }
      });
      return updatedPayments;
    });
  };

  const showModal = (spectacol: Spectacol | null = null) => {
    if (!canAddEdit) return;

    if (spectacol) {
      form.resetFields();
      setEditingSpectacol(spectacol);

      const fields: any = {
        titlu: spectacol.titlu,
        data: dayjs(spectacol.data, 'DD-MM-YYYY'),
        ora: dayjs(spectacol.ora, 'HH:mm'),
        durata: dayjs(spectacol.durata, 'HH:mm'),
        actori: spectacol.actori,
        colaboratori: spectacol.colaboratori?.map(c => c.id) || [],
      };
      ;(spectacol.colaboratori || []).forEach(c => {
        fields[`plata_colaborator_${c.id}`] = c.plata;
      });

      const colaboratorIds = (spectacol.colaboratori || []).map(c => c.id);
      setHasSelectedColaboratori(colaboratorIds.length > 0);
      setColaboratorPayments(
        (spectacol.colaboratori || [])
          .reduce((acc, c) => ({ ...acc, [c.id]: c.plata }), {})
      );

      form.setFieldsValue(fields);
    }
    else {
      form.resetFields();
      setEditingSpectacol(null);
      setHasSelectedColaboratori(false);
      setColaboratorPayments({});
    }

    setIsModalVisible(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setColaboratorPayments({});
    setHasSelectedColaboratori(false);
    setIsModalVisible(false);
    setEditingSpectacol(null);
  };

  const showDistributieModal = async (spectacolId: string) => {
    if (!userId || !canView) return;
    try {
      const spectacolDocRef = doc(db, 'spectacole', spectacolId);
      const spectacolDoc = await getDoc(spectacolDocRef);
      if (!spectacolDoc.exists()) {
        message.error("Spectacolul nu a fost găsit.");
        return;
      }

      const spectacolData = spectacolDoc.data();
      const actorIds = spectacolData.actori || [];
      const colaboratorInfo = spectacolData.colaboratori || [];

      const fetchName = async (id: string) => {
        if (!id) return null;
        const actorDocRef = doc(db, 'artisti', id);
        const actorDoc = await getDoc(actorDocRef);
        return actorDoc.exists() ? `${actorDoc.data().nume} ${actorDoc.data().prenume}` : `ID Necunoscut: ${id}`;
      };

      const actorPromises = actorIds.map(fetchName);
      const colaboratorPromises = colaboratorInfo.map((colab: { id: string }) => fetchName(colab.id));

      const actorNames = (await Promise.all(actorPromises)).filter((name): name is string => name !== null);
      const colaboratorNames = (await Promise.all(colaboratorPromises)).filter((name): name is string => name !== null);

      setSelectedActors(actorNames);
      setSelectedColaborators(colaboratorNames);
      setIsDistributieModalVisible(true);

    } catch (error) {
      message.error("Eroare la preluarea distribuției.");
    }
  };
  const showBileteModal = (spectacolId: string) => {
    if (!canView) return;
    const ticketsForSpectacol = bilete.filter(b => b.spectacol_id === spectacolId);
    
    const ticketsByCatAndPrice = ticketsForSpectacol.reduce((acc, bilet) => {
      const key = `${bilet.categorie_bilet}_${bilet.pret}`; 
      if (!acc[key]) {
        acc[key] = { 
          total: 0, 
          vandute: 0, 
          pret: bilet.pret, 
          categorie_bilet: bilet.categorie_bilet 
        };
      }
      acc[key].total += bilet.nr_bilete;
      acc[key].vandute += (bilet.bilete_vandute ?? 0);
      return acc;
    }, {} as { [key: string]: { total: number, vandute: number, pret: number, categorie_bilet: string } });

    setTicketTableData(
      Object.values(ticketsByCatAndPrice).map(data => ({
        spectacol_id: spectacolId,
        categorie_bilet: data.categorie_bilet,
        pret: data.pret,
        total_bilete: data.total,
        bilete_vandute: data.vandute,
        bilete_ramase: data.total - data.vandute,
      }))
    );
    setIsBileteModalVisible(true);
  };

  const showIncasariModal = (spectacolId: string) => {
    if (!canViewFinancials) return;

    const validBileteForSpectacol = bilete.filter(bilet => 
      bilet.spectacol_id === spectacolId &&
      typeof bilet.pret === 'number' 
    );

    const earnings = validBileteForSpectacol.map((bilet) => ({
      categorie_bilet: bilet.categorie_bilet,
      pret: bilet.pret, 
      total_earnings: (bilet.bilete_vandute ?? 0) * bilet.pret,
      bilete_vandute: bilet.bilete_vandute ?? 0,
    })) as { categorie_bilet: string; pret: number; total_earnings: number; bilete_vandute: number }[];

    const total = earnings.reduce((sum, current) => sum + current.total_earnings, 0);

    setIncasariData(earnings);
    setTotalEarnings(total);
    setIsIncasariModalVisible(true);
  };

  const handleDistributieCancel = () => setIsDistributieModalVisible(false);
  const handleBileteCancel = () => setIsBileteModalVisible(false);
  const handleIncasariCancel = () => setIsIncasariModalVisible(false);

  const handleSoldChange = (value: string | number | null, index: number) => {
    if (!canEditTickets || value === null) return;
    const updatedData = [...ticketTableData];
    const parsedValue = Number(value);

    if (!isNaN(parsedValue) && parsedValue >= 0) {
        const newValue = Math.min(parsedValue, updatedData[index].total_bilete);
        updatedData[index].bilete_vandute = newValue;
        updatedData[index].bilete_ramase = updatedData[index].total_bilete - newValue;
        setTicketTableData(updatedData);
    }
  };

  const handleSaveBilete = async () => {
    if (!userId || !canEditTickets) return;
    setSaving(true);
    try {
      const updates = ticketTableData.map(updatedTicket => {

        const existingTicket = bilete.find(
          (bilet) => 
            bilet.spectacol_id === updatedTicket.spectacol_id && 
            bilet.categorie_bilet === updatedTicket.categorie_bilet &&
            bilet.pret === updatedTicket.pret 
        );
        if (existingTicket) {
          const ticketDocRef = doc(db, 'bilete', existingTicket.key);
          return updateDoc(ticketDocRef, {
            bilete_vandute: updatedTicket.bilete_vandute,
            bilete_ramase: updatedTicket.bilete_ramase,
          });
        }
        return Promise.resolve(); // 
      });

      await Promise.all(updates);

      message.success('Bilete actualizate cu succes!');
      fetchBileteData(); 
      setIsBileteModalVisible(false);
    } catch (error) {
      message.error('Eroare la actualizarea biletelor.');
    } finally {
        setSaving(false);
    }
  };

  const handleDataSearch = () => { 
    if (selectedDataDates) {
      const [startDate, endDate] = selectedDataDates;
      fetchSpectacolData(startDate.format('DD-MM-YYYY'), endDate.format('DD-MM-YYYY'), searchTermSpectacol);
    }
  };
  
  const handleDataResetFilters = () => {
    setSelectedDataDates(null);
    setSearchTermSpectacol('');
    fetchSpectacolData(undefined, undefined, ''); 
  };
  
 
  const onSpectacolTitleSearch = (titleValue: string) => {
    const startDate = selectedDataDates ? selectedDataDates[0].format('DD-MM-YYYY') : undefined;
    const endDate = selectedDataDates ? selectedDataDates[1].format('DD-MM-YYYY') : undefined;
    fetchSpectacolData(startDate, endDate, titleValue);
  };

  const saveSpectacol = async () => {
    if (!userId || !canAddEdit) {
        message.error("Operație nepermisă.");
        return;
    }
    setSaving(true);
    try {
      const values = await form.validateFields();

      const formattedData = {
        titlu: values.titlu,
        data: values.data.format('DD-MM-YYYY'),
        ora: values.ora.format('HH:mm'),
        durata: values.durata.format('HH:mm'),
        actori: values.actori || [],
        colaboratori: (values.colaboratori || []).map((colaboratorId: string) => ({
          id: colaboratorId,
          plata: colaboratorPayments[colaboratorId] || 0,
        })),
      };

      if (editingSpectacol) {
        const spectacolDocRef = doc(db, 'spectacole', editingSpectacol.key);
        await updateDoc(spectacolDocRef, formattedData);
        message.success('Spectacol actualizat cu succes!');
      } else {
        const userSpectacoleCollection = collection(db, 'spectacole');
        await addDoc(userSpectacoleCollection, formattedData);
        message.success('Spectacol adăugat cu succes!');
      }

      handleCancel();
      fetchSpectacolData();
    } catch (error) {
      message.error('Eroare la salvarea spectacolului.');
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!userId || !canDelete) {
        message.error("Operație nepermisă.");
        return;
    }
    setLoading(true);
    try {
        const spectacolDocRef = doc(db, 'spectacole', key);
        await deleteDoc(spectacolDocRef);
        message.success('Spectacol șters cu succes!');
        fetchSpectacolData();
    } catch (error) {
        message.error('Eroare la ștergerea spectacolului.');
        setLoading(false);
    }
  };

  function calculateTotalEarnings(spectacoleData: Spectacol[], bileteData: BiletType[]) {
    if (!canViewFinancials) return 0;
    let total = 0;
    spectacoleData.forEach(spectacol => {
        const spectacolBilete = bileteData.filter(bilet => 
            bilet.spectacol_id === spectacol.key &&
            typeof bilet.pret === 'number' 
        );
        const spectacolEarnings = spectacolBilete.reduce((sum, bilet) => {
            return sum + ((bilet.bilete_vandute ?? 0) * bilet.pret);
        }, 0);
        total += spectacolEarnings;
    });
    return total;
  }

  const handleExportExcel = () => {
    if (!data.length) {
      message.info('Nu există date de exportat.');
      return;
    }

    const sortedData = [...data].sort((a, b) => a.titlu.localeCompare(b.titlu));

    const dataToExport = sortedData.map(spectacol => {
      const row: any = {
        'Titlu': spectacol.titlu,
        'Data': spectacol.data,
        'Ora': spectacol.ora,
        'Durata': spectacol.durata,
      };

      if (actorData.length > 0) {
        const actoriNume = spectacol.actori
          .map(actorId => actorData.find(a => a.value === actorId)?.label || `ID: ${actorId}`)
          .join(', ');
        row['Actori (Angajați)'] = actoriNume || '-';
      } else {
        row['Actori (Angajați)'] = spectacol.actori.join(', ') || '-';
      }

      if (colaboratorData.length > 0) {
        const colaboratoriDetalii = (spectacol.colaboratori || [])
          .map(colab => {
            const nume = colaboratorData.find(c => c.value === colab.id)?.label || `ID: ${colab.id}`;
            return canViewFinancials ? `${nume}` : nume;
          })
          .join(', ');
        row['Colaboratori'] = colaboratoriDetalii || '-';
      } else {
         const colaboratoriDetalii = (spectacol.colaboratori || [])
          .map(colab => {
            const idPart = `ID: ${colab.id}`;
            return canViewFinancials ? `${idPart}` : idPart;
          })
          .join(', ');
        row['Colaboratori'] = colaboratoriDetalii || '-';
      }

      if (canViewFinancials) {
        const spectacolBilete = bilete.filter(b => b.spectacol_id === spectacol.key);
        const totalBileteVanduteSpectacol = spectacolBilete.reduce((sum, bilet) => sum + (bilet.bilete_vandute ?? 0), 0);
        const totalIncasariSpectacol = spectacolBilete.reduce((sum, bilet) => sum + ((bilet.bilete_vandute ?? 0) * bilet.pret), 0);

        row['Total Bilete Vândute (spectacol)'] = totalBileteVanduteSpectacol;
        row['Total Încasări (lei) (spectacol)'] = totalIncasariSpectacol;
      }
      return row;
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Spectacole');
      XLSX.writeFile(workbook, 'Spectacole.xlsx');
      message.success('Datele au fost exportate cu succes în Spectacole.xlsx!');
    } catch (error) {
      message.error("Eroare la exportul datelor în Excel.");
    }
  };

  const columns: TableProps<Spectacol>['columns'] = [
    { title: 'Titlu', dataIndex: 'titlu', key: 'titlu', width: 200, sorter: (a, b) => a.titlu.localeCompare(b.titlu), defaultSortOrder: 'ascend' },
    { title: 'Data', dataIndex: 'data', key: 'data', width: 100 },
    { title: 'Ora', dataIndex: 'ora', key: 'ora', width: 100 },
    { title: 'Durata', dataIndex: 'durata', key: 'durata', width: 100 },
    {
      title: 'Detalii',
      key: 'detalii',
      width: 100,
      render: (_, record) => (
        <Space direction="horizontal" size={3}>
          <Tooltip title="Distribuție">
            <Button type="link" style={{ color: 'black' }} icon={<TeamOutlined />} onClick={() => showDistributieModal(record.key)} className='tabbutton' />
          </Tooltip>
          <Tooltip title="Bilete">
            <Button type="link" style={{ color: 'black' }} icon={<DollarOutlined />} onClick={() => showBileteModal(record.key)} className='tabbutton' />
          </Tooltip>
          {canViewFinancials && (
            <Tooltip title="Încasări">
              <Button type="link" style={{ color: 'black' }} icon={<EyeOutlined />} onClick={() => showIncasariModal(record.key)} className='tabbutton' />
            </Tooltip>
          )}
        </Space>
      ),
    },
    ...(canAddEdit || canDelete ? [{
        title: 'Acțiuni',
        key: 'action',
        width: 50,
        render: (_: any, record: Spectacol) => (
            <Space size="middle">
                {canAddEdit && (
                    <Tooltip title="Editare">
                        <Button type="link" style={{ color: 'black' }} icon={<EditOutlined />} onClick={() => showModal(record)} />
                    </Tooltip>
                )}
                {canDelete && (
                    <Popconfirm
                        title="Sigur doriți să ștergeți acest spectacol?"
                        onConfirm={() => handleDelete(record.key)}
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        okText="Da"
                        cancelText="Nu"
                    >
                        <Tooltip title="Ștergere">
                            <Button type="link" style={{ color: 'black' }}icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                )}
            </Space>
        ),
    }] : []),
  ];

  if (!canView) {
      return <Typography.Text>Nu aveți permisiunea de a vizualiza această secțiune.</Typography.Text>;
  }

  if (loadingArtistId) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}><Spin size="large" tip="Identificare artist..." /></div>;
  }

  return (
    <>
      
        {canAddEdit && (
          <Button type="primary" shape="round" onClick={() => showModal()}>
            Adăugare spectacol
          </Button>
        )}

      <br/>
      <br/>
      <br/>
      <Space direction="vertical" size={15} style={{ marginBottom: 16, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space direction="horizontal">
      <Input.Search
            placeholder="Cautare după titlu"
            value={searchTermSpectacol}
            onChange={(e) => {
              const currentSearchValue = e.target.value;
              setSearchTermSpectacol(currentSearchValue);
              if (currentSearchValue === '') {
                const startDate = selectedDataDates ? selectedDataDates[0].format('DD-MM-YYYY') : undefined;
                const endDate = selectedDataDates ? selectedDataDates[1].format('DD-MM-YYYY') : undefined;
                fetchSpectacolData(startDate, endDate, '');
              }
            }}
            onSearch={onSpectacolTitleSearch} 
            style={{ width: 300 }}
            allowClear
            
        />
    </Space>
    <Space direction="horizontal" size={15}>
     <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8 }}>Filtare după dată:</span>
          </div>
        <DatePicker.RangePicker
          format="DD-MM-YYYY"
          value={selectedDataDates}
          onChange={(dates) => setSelectedDataDates(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
        />
        <Button onClick={handleDataSearch} disabled={!selectedDataDates}>
          Filtare
        </Button>
        <Button onClick={handleDataResetFilters}>
          Resetare filtre
        </Button>
        </Space>
    </div>
      </Space>
      {canView && (
         <Space direction="horizontal" size={10} style={{ marginLeft: 16, display: 'flex', float: 'right' }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportExcel}
              disabled={data.length === 0}
            >
              Export Excel
            </Button>
            </Space>
            
        )}
      <br/>
      <br/>
      <br/>
      <br/>
      <Table
        columns={columns}
        dataSource={data}
        size="small"
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        rowKey="key"
        loading={loading}
        scroll={{ x: 'max-content' }}
        footer={canViewFinancials ? () => (
          <div style={{textAlign: 'right'}}>
              <Typography.Text strong>Total încasări: {calculateTotalEarnings(data, bilete)} lei</Typography.Text>
          </div>
        ) : undefined}
      />

      <Modal
        title={editingSpectacol ? "Editare spectacol" : "Adăugare spectacol"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
            <Button key="back" onClick={handleCancel}>
              Anulare
            </Button>,
            <Button key="submit" type="primary" loading={saving} onClick={saveSpectacol}>
              {editingSpectacol ? "Salvare modificări" : "Adăugare"}
            </Button>,
          ]}
        destroyOnClose
      >
        <br />
        <Form form={form} layout="vertical" autoComplete="off" >
          <Form.Item
            label="Titlu"
            name="titlu"
            rules={[{ required: true, message: 'Introduceți denumirea spectacolului!' }]}
          >
            <Input style={{ width: '100%' }} />
          </Form.Item>
          <Space direction="horizontal" size={15} style={{width: '100%'}} align="baseline">
            <Form.Item
              label="Data"
              name="data"
              rules={[{ required: true, message: 'Selectați data spectacolului!' }]}
              style={{ flex: 1 }}
            >
              <DatePicker
                format="DD-MM-YYYY"
                placement="bottomRight"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="Ora"
              name="ora"
              rules={[{ required: true, message: 'Selectați ora spectacolului!' }]}
               style={{ flex: 1 }}
            >
              <TimePicker
                format="HH:mm"
                style={{ width: '100%' }}
                placeholder="Selectați ora"
                minuteStep={5}
                showNow={false}
              />
            </Form.Item>
             <Form.Item
              label="Durata"
              name="durata"
              rules={[{ required: true, message: 'Selectați durata spectacolului!' }]}
               style={{ flex: 1 }}
            >
              <TimePicker
                format="HH:mm"
                style={{ width: '100%' }}
                showNow={false}
                placeholder="Selectați durata"
                minuteStep={5}
              />
            </Form.Item>
          </Space>
          <Form.Item
            label="Actori"
            name="actori"
            rules={[{ required: true, message: 'Selectați actorii spectacolului!' }]}
          >
            <Select
              mode="multiple"
              options={actorData}
              placeholder="Selectați actorii"
              style={{ width: '100%' }}
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            label="Colaboratori"
            name="colaboratori"
          >
            <Select
              mode="multiple"
              options={colaboratorData}
              placeholder="Selectați colaboratorii"
              style={{ width: '100%' }}
              optionFilterProp="label"
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
              }
              onChange={handleColaboratoriChange}
            />
          </Form.Item>

          {hasSelectedColaboratori &&
            form.getFieldValue('colaboratori')?.map((colaboratorId: string) => {
              const colaboratorName = colaboratorData.find(c => c.value === colaboratorId)?.label;
              return (
                <Form.Item
                  key={colaboratorId}
                  label={`Sumă plată ${colaboratorName || `ID: ${colaboratorId}`}`}
                  name={`plata_colaborator_${colaboratorId}`}
                  rules={[{ required: true, message: 'Introduceți plata!' }]}
                >
                 
                  <InputNumber
                    style={{ width: 150 }}
                    addonAfter="lei"
                    min={1}
                    parser={(value) => parseInt(value?.replace(/\D/g, '') || '0', 10) || 1}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    onChange={(value) => {
                      setColaboratorPayments((prev) => ({ ...prev, [colaboratorId]: Number(value) || 0 }));
                    }}
                  />
                </Form.Item>
              );
            })}
        </Form>
      </Modal>

      <Modal
        title="Distribuție"
        open={isDistributieModalVisible}
        onCancel={handleDistributieCancel}
        footer={null}
      >
        <br />
        {selectedActori.length > 0 && (
          <>
            <div><b>Actori:</b></div>
            <ul className="actor-list">
              {selectedActori.map((actorName, index) => <li key={`actor-${index}`}>{actorName}</li>)}
            </ul>
            <br />
          </>
        )}
        {selectedColaboratori.length > 0 && (
          <>
            <div><b>Colaboratori:</b></div>
            <ul className="colaborator-list">
              {selectedColaboratori.map((colaboratorName, index) => <li key={`colab-${index}`}>{colaboratorName}</li>)}
            </ul>
          </>
        )}
        {selectedActori.length === 0 && selectedColaboratori.length === 0 && (
          <p>Nu sunt actori sau colaboratori selectați.</p>
        )}
      </Modal>

      <Modal
        title="Detalii bilete"
        open={isBileteModalVisible}
        onCancel={handleBileteCancel}
        footer={null}
        destroyOnClose
      >
        {ticketTableData.length > 0 ? (
          <>
            <Table
              dataSource={ticketTableData}
              columns={[
                { title: 'Categorie', dataIndex: 'categorie_bilet', key: 'categorie_bilet' },
                { title: 'Preț (lei)', dataIndex: 'pret', key: 'pret' }, 
                { title: 'Total bilete', dataIndex: 'total_bilete', key: 'total_bilete' },
                {
                  title: 'Bilete vândute',
                  dataIndex: 'bilete_vandute',
                  key: 'bilete_vandute',
                  render: (text, record, index) => (
                    <InputNumber
                      min={0}
                      max={record.total_bilete}
                      value={text}
                      onChange={(value) => handleSoldChange(value, index)}
                      style={{ width: 80 }}
                      disabled={!canEditTickets}
                    />
                  ),
                },
                { title: 'Bilete rămase', dataIndex: 'bilete_ramase', key: 'bilete_ramase' },
              ]}
              pagination={false}
              rowKey={(record) => `${record.categorie_bilet}-${record.pret}`}
              size="small"
            />
            <br />
            {canEditTickets && (
                <Button key="save" type="primary" shape='round' loading={saving} onClick={handleSaveBilete}>
                  Salvare modificări bilete
                </Button>
            )}
          </>
        ) : (
          <p>Nu sunt bilete definite pentru acest spectacol.</p>
        )}
      </Modal>

      <Modal
        title="Încasări"
        open={isIncasariModalVisible}
        onCancel={handleIncasariCancel}
        footer={null}
      >
        {incasariData.length > 0 ? (
          <>
            <br />
            <Table
              dataSource={incasariData}
              columns={[
                { title: 'Categorie', dataIndex: 'categorie_bilet', key: 'categorie_bilet' },
                { title: 'Preț (lei)', dataIndex: 'pret', key: 'pret' }, 
                { title: 'Bilete vândute', dataIndex: 'bilete_vandute', key: 'bilete_vandute' },
                { title: 'Încasări (lei)', dataIndex: 'total_earnings', key: 'total_earnings' },
              ]}
              rowKey={(record) => `${record.categorie_bilet}-${record.pret}`} 
              pagination={false}
              size="small"
              footer={() => <div style={{textAlign: 'right'}}><Typography.Text strong>Total: {totalEarnings} lei</Typography.Text></div>}
            />
            <br />
          </>
        ) : (
          <p>Nu există încasări pentru acest spectacol.</p>
        )}
      </Modal>
    </>
  );
};

export default Spectacole;