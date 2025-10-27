import * as React from "react";
export function ForensicBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)] opacity-10"></div>
      
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-background" />

      <div className="absolute top-1/4 left-0 w-[50vw] h-[1px] bg-gradient-to-r from-primary/50 to-transparent animate-line-left" />
      <div className="absolute bottom-1/4 right-0 w-[50vw] h-[1px] bg-gradient-to-l from-primary/50 to-transparent animate-line-right" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.1),transparent_40%)]"></div>
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background to-transparent"></div>
    </div>
  );
}
