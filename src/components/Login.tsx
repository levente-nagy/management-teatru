import React, { useState } from "react";
import { auth } from "../Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Form, Input, Button, message, Flex, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";


interface LoginProps {
  onRegisterClick: () => void;

}

const Login: React.FC<LoginProps> = ({ onRegisterClick }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      message.success("Autentificare reusită!");

    } catch (error: any) {
        if (error.code === "auth/invalid-credential") {
            message.error("Credenţiale incorecte. Vă rugăm să verificați emailul și parola.");
        } else {
            setAuthError(error.message || "Failed to login.");
            message.error(error.message || "Failed to login.");
        }
      
    } finally {
      setLoading(false);
    }
  };

  return (
<Flex gap="middle" align="center" justify="center" vertical style={{ width: '100%' }}>
<img src="/banner.jpg" className='banner' />

<Typography.Title level={4}>Bun găsit!</Typography.Title>
        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: "Introduceți email!" }]}
            help={authError}
            validateStatus={authError ? 'error' : ''}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              type="email"
              placeholder="Email"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Introduceți parola!" }]}
            validateStatus={authError ? 'error' : ''}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Parolă"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              shape="round"
              htmlType="submit"
              loading={loading}
              block
            >
              Autentificare
            </Button>
          </Form.Item>
        </Form>
        <Button type="link" onClick={onRegisterClick} block>
          Nu aveți cont? Înregistrați-vă aici
        </Button>
</Flex>
  );
};

export default Login;