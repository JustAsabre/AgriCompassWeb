import { Loader2 } from "lucide-react";

export function Loader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse w-16 h-16"></div>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-wide">
                LOADING...
            </p>
        </div>
    );
}

export function FullPageLoader() {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Loader />
        </div>
    );
}
