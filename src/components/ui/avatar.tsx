import { getUserInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ name, color, imageUrl, size = "md" }: AvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
  };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        title={name}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium shrink-0`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getUserInitials(name)}
    </div>
  );
}
