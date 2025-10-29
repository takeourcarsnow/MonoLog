// AuthMessage.tsx
interface AuthMessageProps {
  mode: "signin" | "signup" | "forgot";
  signupSent?: boolean;
}

export function AuthMessage({ mode, signupSent }: AuthMessageProps) {
  const getMessage = () => {
    if (mode === "signin" && signupSent) {
      return {
        title: "Check your email",
        subtitle: "We've sent you a confirmation link"
      };
    } else if (mode === "signin") {
      return {
        title: "Welcome back",
        subtitle: "Your memories are waiting"
      };
    } else if (mode === "forgot") {
      return {
        title: "Reset your password",
        subtitle: "Enter your email to receive reset instructions"
      };
    } else {
      return {
        title: "Start your journey",
        subtitle: "One post. One day. One story."
      };
    }
  };

  const message = getMessage();

  return (
    <div
      key={mode}
      className="auth-message"
      style={{
        animation: 'authHeaderFlip 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
    >
      <strong
        style={{
          fontSize: 20,
          display: 'block',
          marginBottom: 4,
          lineHeight: 1.15
        }}
      >
        {message.title}
      </strong>
      <div
        className="dim"
        style={{
          fontSize: 13,
          lineHeight: 1.2
        }}
      >
        {message.subtitle}
      </div>
    </div>
  );
}