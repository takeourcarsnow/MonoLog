// AuthMessage.tsx
interface AuthMessageProps {
  mode: "signin" | "signup";
}

export function AuthMessage({ mode }: AuthMessageProps) {
  const getMessage = () => {
    if (mode === "signin") {
      return {
        title: "Welcome back",
        subtitle: "Your memories are waiting"
      };
    } else {
      return {
        title: "Start your journey",
        subtitle: "One photo. One day. One story."
      };
    }
  };

  const message = getMessage();

  return (
    <div
      key={mode}
      className="auth-message"
      style={{
        animation: 'fadeInSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
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