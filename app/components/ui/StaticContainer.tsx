import React from "react";

interface StaticContainerProps {
  as?: React.ElementType;
  wrapperClass?: string;
  innerClass?: string;
  children?: React.ReactNode;
}

export function StaticContainer({
  as: Tag = "div",
  wrapperClass = "",
  innerClass = "",
  children,
}: StaticContainerProps) {
  return (
    <Tag className={wrapperClass}>
      <div className={innerClass}>{children}</div>
    </Tag>
  );
}

export default StaticContainer;
