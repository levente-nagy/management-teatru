import React, { useState, useEffect } from "react";
import { ConfigProvider, Layout, Card, Menu, message, Spin, Typography, Divider, Space } from "antd";
const { Content, Footer, Sider } = Layout;
import { CalendarOutlined, ContainerOutlined, EuroCircleOutlined, GithubOutlined, LogoutOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import locale from "antd/locale/ro_RO";
import dayjs from "dayjs";
import "dayjs/locale/ro";
import Spectacole from "./components/Spectacole";
import Artisti from "./components/Artisti";
import Bilete from "./components/Bilete";
import Costuri from "./components/Costuri";
import Login from "./components/Login";
import Register from "./components/Register";
import Profil from "./components/Profil";
import { getAuth, onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./Firebase";

interface UserProfile {
    nume: string;
    prenume: string;
    rol: string;
    email: string;
    uid: string;
}

const getAdminMenuItems = () => [
    { label: "Artişti", key: "artisti", icon: <TeamOutlined /> },
    { label: "Spectacole", key: "spectacole", icon: <CalendarOutlined /> },
    { label: "Bilete", key: "bilete", icon: <ContainerOutlined /> },
    { label: "Costuri", key: "costuri", icon: <EuroCircleOutlined /> },
];

const getHrMenuItems = () => [
    { label: "Artişti", key: "artisti", icon: <TeamOutlined /> },
    { label: "Costuri", key: "costuri", icon: <EuroCircleOutlined /> },
];

const getTicketingMenuItems = () => [
    { label: "Spectacole", key: "spectacole", icon: <CalendarOutlined /> },
    { label: "Bilete", key: "bilete", icon: <ContainerOutlined /> },
];

const getCoordinatorMenuItems = () => [
    { label: "Artişti", key: "artisti", icon: <TeamOutlined /> },
    { label: "Spectacole", key: "spectacole", icon: <CalendarOutlined /> },
];

const getViewerMenuItems = () => [
    { label: "Spectacole", key: "spectacole", icon: <CalendarOutlined /> },
    { label: "Date personale", key: "profil", icon: <UserOutlined /> },
];


const Home: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedItem, setSelectedItem] = useState<string | null>(() => {
    return localStorage.getItem("selectedMenuItem");
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      setIsLoadingProfile(true);


      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        try {
          const userDocRef = doc(db, "utilizatori", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profile = userDocSnap.data() as UserProfile;
            setUserProfile(profile);

            let currentMenuItems: any[] = [];
            switch (profile.rol) {
                case "Administrator":
                    currentMenuItems = getAdminMenuItems();
                    break;
                case "Resurse umane":
                    currentMenuItems = getHrMenuItems();
                    break;
                case "Casier":
                    currentMenuItems = getTicketingMenuItems();
                    break;
                case "Coordonator":
                    currentMenuItems = getCoordinatorMenuItems();
                    break;
                case "Artist": 
                    currentMenuItems = getViewerMenuItems();
                    break;
                default:
                    currentMenuItems = [];
            }
            setMenuItems(currentMenuItems);

            const storedSelectedItem = localStorage.getItem("selectedMenuItem");
            if (storedSelectedItem && currentMenuItems.some(item => item.key === storedSelectedItem)) {
                setSelectedItem(storedSelectedItem);
            } else if (currentMenuItems.length > 0) {
                setSelectedItem(currentMenuItems[0].key);
                localStorage.setItem("selectedMenuItem", currentMenuItems[0].key);
            } else {
                setSelectedItem(null);
                localStorage.removeItem("selectedMenuItem");
            }

          } else {
            console.error("Documentul utilizatorului nu a fost găsit în Firestore!");
            message.error("Profilul utilizatorului nu a putut fi încărcat. Contactați administratorul.");
            localStorage.removeItem("selectedMenuItem");
            handleLogout(); 
          }
        } catch (error) {
          console.error("Eroare la preluarea profilului din Firestore:", error);
          message.error("Eroare la încărcarea profilului.");
          setUserProfile(null); 
          setMenuItems([]); 
          setSelectedItem(null); 
          localStorage.removeItem("selectedMenuItem"); 
        } finally {
           setIsLoadingProfile(false);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
        setMenuItems([]);
        setSelectedItem(null);
        localStorage.removeItem("selectedMenuItem");
        setIsLoadingProfile(false);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout | undefined;
    const INACTIVITY_TIMEOUT_DURATION_MS = 10 * 60 * 1000; 

    const performSignOut = async (reasonMessage: string) => {
      const auth = getAuth();
      if (auth.currentUser) {
        try {
          await signOut(auth);
          message.info(`Ați fost deconectat automat. ${reasonMessage}`);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setUserProfile(null);
          setMenuItems([]);
          setSelectedItem(null);
          localStorage.removeItem("selectedMenuItem");
        } catch (error) {
          console.error("Eroare la deconectarea automată:", error);
          message.error("Eroare la deconectarea automată.");
        }
      }
    };

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        performSignOut("Motiv: inactivitate.");
      }, INACTIVITY_TIMEOUT_DURATION_MS);
    };

    const handleUserActivity = () => {
      if (isAuthenticated && currentUser) { 
        resetInactivityTimer();
      }
    };


    const activityEventTypes: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    if (isAuthenticated && currentUser) {
      resetInactivityTimer();
      activityEventTypes.forEach(eventType => window.addEventListener(eventType, handleUserActivity));
    } else {
      clearTimeout(inactivityTimer);
      activityEventTypes.forEach(eventType => window.removeEventListener(eventType, handleUserActivity));
    }

    return () => {
      clearTimeout(inactivityTimer);
      activityEventTypes.forEach(eventType => window.removeEventListener(eventType, handleUserActivity));
    };
  }, [isAuthenticated, currentUser]); 

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleMenuItemClick = (key: string) => {
    if (key === "logout") {
      handleLogout();
    } else {
      setSelectedItem(key);
      localStorage.setItem("selectedMenuItem", key);
    }
  };

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
        setMenuItems([]);
        setSelectedItem(null);
        localStorage.removeItem("selectedMenuItem");
    }).catch((error) => {
      console.error("Eroare la deconectare:", error);
      message.error("Eroare la deconectare.");
    });
  };

  dayjs.locale("ro");


  const renderLayoutContent = () => {
    if (!currentUser || !userProfile || !selectedItem) return null;

    switch (userProfile.rol) {
        case "Administrator":
            switch (selectedItem) {
                case "artisti": return <Artisti userId={currentUser.uid} userRole={userProfile.rol} />;
                case "spectacole": return <Spectacole userId={currentUser.uid} userRole={userProfile.rol} />;
                case "bilete": return <Bilete userId={currentUser.uid} userRole={userProfile.rol} />;
                case "costuri": return <Costuri userId={currentUser.uid} userRole={userProfile.rol} />;
                default: return <div>Secțiune invalidă</div>;
            }
        case "Resurse umane":
            switch (selectedItem) {
                case "artisti": return <Artisti userId={currentUser.uid} userRole={userProfile.rol} />;
                case "costuri": return <Costuri userId={currentUser.uid} userRole={userProfile.rol} />;
                default: return <div>Acces nepermis</div>;
            }
        case "Casier":
            switch (selectedItem) {
                case "spectacole": return <Spectacole userId={currentUser.uid} userRole={userProfile.rol} />;
                case "bilete": return <Bilete userId={currentUser.uid} userRole={userProfile.rol} />;
                default: return <div>Acces nepermis</div>;
            }
        case "Coordonator":
             switch (selectedItem) {
                case "artisti": return <Artisti userId={currentUser.uid} userRole={userProfile.rol} />;
                case "spectacole": return <Spectacole userId={currentUser.uid} userRole={userProfile.rol} />;
                default: return <div>Acces nepermis</div>;
            }
        case "Artist":
              switch (selectedItem) {
                case "spectacole": return <Spectacole userId={currentUser.uid} userRole={userProfile.rol} userEmail={currentUser?.email} />;
                case "profil": return <Profil userEmail={currentUser?.email} />;
                default: return <div>Acces nepermis</div>;
             }
        default:
            return <div>Rol necunoscut sau neautorizat.</div>;
    }
  };


  if (isLoadingAuth || (isAuthenticated && isLoadingProfile)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#f0f2f5' }}>
       <Spin size="large" />
      </div>
    );
  }


  if (!isAuthenticated) {
    return (
      <ConfigProvider
        locale={locale}
        theme={{ token: { colorPrimary: "#fdb913", colorInfo: "#fdb913" } }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", width: "100vw", backgroundColor: "#f0f2f5" }}>
          <Card style={{ width: "100%", maxWidth: "400px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
            {showRegister ? (<Register onBackToLogin={() => setShowRegister(false)} />) : (<Login onRegisterClick={() => setShowRegister(true)} />)}
          </Card>
        </div>
      </ConfigProvider>
    );
  }


  return (
    <ConfigProvider
      locale={locale}
      theme={{ token: { colorPrimary: "#fdb913", colorInfo: "#fdb913" } }}
    >
      <Layout style={{ minHeight: "100vh", width: `${windowWidth}px` }}>
      <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflowY: 'hidden', 
            position: 'sticky',  
            top: 0,              
            zIndex: 1            
          }}
        >

          <div style={{ flex: '1 1 auto', overflowY: 'auto', 
            minHeight: 0 }}>
            {!collapsed && userProfile && (
              <div style={{ marginBottom:'10px', padding: '5px', textAlign: 'center' }}>
                <br/>
                <img className="banner" style={{ width: '60%', borderRadius: '100px',  border: '2px solid white' }} alt="Banner" src="/banner.jpg"/>
                <Typography.Title level={5} style={{ color: 'white', marginBottom: '2px', marginTop: '10px' }}>
                  {userProfile.prenume} {userProfile.nume}
                </Typography.Title>
                <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                  {userProfile.rol}
                </Typography.Text>
              </div>
            )}
             {!collapsed && !userProfile && (
                 <div style={{ padding: '16px', textAlign: 'center' }}> <Spin size="small" /> </div>
             )}
            <Divider style={{ backgroundColor: 'rgba(55, 50, 50, 0.65)', margin: '0 0 5px 0' }} />


            <Menu
              theme="dark"
              selectedKeys={selectedItem ? [selectedItem] : []}
              mode="inline"
              items={menuItems}
              onClick={({ key }) => handleMenuItemClick(key)}
            />
          </div>

          <div style={{ flexShrink: 0 }}>
          <Divider style={{ backgroundColor: 'rgba(55, 50, 50, 0.65)', margin: '5px 0 0 0' }} />
          <div >
            <Menu
              theme="dark"
              mode="inline"
              selectable={false}
              onClick={({ key }) => handleMenuItemClick(key)}
              items={[ { label: "Deconectare", key: "logout", icon: <LogoutOutlined /> } ]}
            />
          </div>
          </div>
        </Sider>


        <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Content
             style={{
               flex: '1 1 auto', 
               padding: 24,
               minHeight: 280, 
               background: '#fff',
               overflow: 'auto' 
             }}
          >
            {renderLayoutContent()}
          </Content>
          <Footer style={{ textAlign: "center", flexShrink: 0 }}> 
            <Space direction="horizontal" size="middle" >
            Levente NAGY © {new Date().getFullYear()}
            <button onClick={() => window.open("https://github.com/levente-nagy/management-teatru", "_blank")} style={{ background: '#f5f5f5', color:"black", border: 'none', cursor: 'pointer' }}>
            <GithubOutlined/>
            </button>
             
            </Space>
            
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default Home;