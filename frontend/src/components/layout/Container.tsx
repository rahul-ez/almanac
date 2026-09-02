// frontend/src/components/layout/Container.tsx
// One centered, max-width content wrapper per page. Never nested.
// Per ui-registry.md: max-width 1120px, --space-4 side padding below --bp-md,
// --space-8 at --bp-lg and above.

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`w-full max-w-container mx-auto px-4 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
