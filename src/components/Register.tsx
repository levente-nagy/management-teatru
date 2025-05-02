import React, { useState } from "react";
import { Form, Input, Button, message, Typography, Flex, Select } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { auth, db } from "../Firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const userRoles = [
  { value: "Administrator", label: "Administrator" },
  { value: "Resurse umane", label: "Resurse umane" },
  { value: "Casier", label: "Casier" },
  { value: "Coordonator", label: "Coordonator" },
  { value: "Artist", label: "Artist" },
];

interface RegisterProps {
  onBackToLogin: () => void;
}

interface RegisterFormValues {
    nume: string;
    prenume: string;
    email: string;
    password: string;
    rol: string;
}


const Register: React.FC<RegisterProps> = ({ onBackToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await setDoc(doc(db, "utilizatori", user.uid), {
        nume: values.nume,
        prenume: values.prenume,
        email: values.email,
        rol: values.rol,
        uid: user.uid
      });

      message.success("Înregistrare reusită!");
      onBackToLogin();
    } catch (error: any) {
        if (error.code === "auth/email-already-in-use") {
          message.error("Acest email este deja folosit. Vă rugăm să folosiți altul.");
        } else if (error.code) {
            message.error(`Eroare (${error.code}): ${error.message}`);
        }
         else {
          message.error(error.message || "Failed to register user.");
        }
      } finally {
        setLoading(false);
      }
    };

  return (
    <Flex gap="small" align="center" justify="center" vertical style={{ width: '100%' }}>
      
      <img src="/banner.jpg" className='banner' style={{width: '30%'}}/>

      <Typography.Title level={4}>Utilizator nou</Typography.Title>
      <br/>
      <Form
        name="register"
        form={form}
        onFinish={onFinish}

        style={{ maxWidth: 400, margin: "0 auto" }}
        autoComplete="off"
      >
                <Form.Item
          
          name="prenume"
          rules={[{ required: true, message: "Introduceți prenumele!" }]}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="Prenume"
          />
        </Form.Item>
        <Form.Item
          
          name="nume"
          rules={[{ required: true, message: "Introduceți numele!" }]}
        >
          <Input
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="Nume"
          />
        </Form.Item>

        <Form.Item
          
          name="email"
          rules={[{ required: true, type: 'email', message: "Introduceți un email valid!" }]}
        >
          <Input
            prefix={<MailOutlined className="site-form-item-icon" />}
            type="email"
            placeholder="Email"
            onChange={(e) => {
              const { value } = e.target;
              form.setFieldsValue({ email: value.toLowerCase() });
            }}
          />
        </Form.Item>
        <Form.Item
          
          name="password"
          rules={[{ required: true, message: "Introduceți parola!" }, { min: 6, message: 'Parola trebuie să aibă minim 6 caractere!' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Parolă"
          />
        </Form.Item>

        <Form.Item
            label="Tip Cont"
            name="rol"
            rules={[{ required: true, message: "Selectați tipul de cont!" }]}
        >
            <Select placeholder="Selectați un rol">
                {userRoles.map(rol => (
                    <Select.Option key={rol.value} value={rol.value}>
                        {rol.label}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            shape="round"
            htmlType="submit"
            loading={loading}
            block
          >
            Înregistrare
          </Button>
        </Form.Item>
      </Form>
      <Button type="link" onClick={onBackToLogin}>
      Înapoi la autentificare
      </Button>
    </Flex>
  );
};

export default Register;