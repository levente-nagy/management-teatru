import { useState, useEffect } from 'react';
import type { MenuProps } from 'antd';
import {  ConfigProvider, Layout, Menu } from 'antd';
const { Content, Footer, Sider } = Layout;
import locale from 'antd/locale/ro_RO';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import Spectacole from './components/Spectacole';
import Actori from './components/Actori';
import Bilete from './components/Bilete';
import Costuri from './components/Costuri';
type MenuItem = Required<MenuProps>['items'][number];




function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('Actori', '1'),
  getItem('Spectacole', '2'),
  getItem('Bilete', '3'),
  getItem('Costuri adiționale', '4'),
];

const Home: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [selectedItem, setSelectedItem] = useState<string>('1');


  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };

    
  }, []);



  const handleMenuItemClick = (key: string) => {
    setSelectedItem(key);
  };



  dayjs.locale('ro');

  

  const renderLayout = () => {
    switch (selectedItem) {
      case '1':
        return <Content style={{ margin: windowWidth < 1920 ? '0 32px 0 16px' : '0 16px' }}>
         <Actori />
        </Content>;
      case '2':
        return <Content style={{ margin: windowWidth < 1920 ? '0 32px 0 16px' : '0 16px' }}>
       <Spectacole />
        </Content>;
      case '3':
        return <Content style={{ margin: windowWidth < 1920 ? '0 32px 0 16px' : '0 16px' }}>
         <Bilete />
        </Content>;
        case '4':
          return <Content style={{ margin: windowWidth < 1920 ? '0 32px 0 16px' : '0 16px' }}>
         <Costuri />
        </Content>;
      default:
        return null;
    }
  };

  return (
    <ConfigProvider
    locale={locale}
    theme={{
      token: {
        colorPrimary: "#fdb913",
        colorInfo: "#fdb913"
        
      },
    }}
  >
    <Layout style={{ minHeight: '100vh', width:  `${windowWidth}px` }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items}  onClick={(e) => handleMenuItemClick(e.key)}/>
      </Sider>
      <Layout>
      {renderLayout()}
        <Footer style={{ textAlign: 'center' }}>
          Tema 13 - Cosmin C., Mitica A., Levente N. © {new Date().getFullYear()}
        </Footer>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
};

export default Home;

