import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button({ children, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        border: 0,
        borderRadius: 8,
        padding: "12px 18px",
        fontWeight: 700,
        cursor: "pointer",
        background: "#e0f2fe",
        color: "#020617",
        ...style
      }}
    >
      {children}
    </button>
  );
}
