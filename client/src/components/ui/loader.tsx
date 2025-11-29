import { Loader2 } from "lucide-react";

export function Loader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="relative flex items-center justify-center">
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
