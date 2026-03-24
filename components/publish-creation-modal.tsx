import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Share, X } from "lucide-react";

interface PublishCreationModalProps {
    creationId: string;
    onSuccess?: () => void;
    onClose: () => void;
}

export function PublishCreationModal({ creationId, onSuccess, onClose }: PublishCreationModalProps) {
    const [caption, setCaption] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);

    
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    
    const publishPost = httpsCallable(functions, "publishPost");
    const handlePublish = async () => {
        if (!creationId) return;
        setIsPublishing(true);
        try {
            await publishPost({
                creationId: creationId,
                caption: caption,
                
                tags: ["community", "creation"]
            });

            console.log("Successfully published to the public Community Feed!");
            if (onSuccess) onSuccess();
            
            onClose();
        } catch (e: any) {
            console.error("Publishing Failed:", e);
            alert("Error publishing: " + e.message);
        } finally {
            setIsPublishing(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-[#111] border border-white/[0.08] shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                {}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Share className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Publish to Community</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/[0.05] hover:bg-white/[0.1] rounded-full transition-colors text-zinc-400 hover:text-white"
                        disabled={isPublishing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                        Share your creation with the world. Feel free to add a caption to describe your vision or technique.
                    </p>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Caption (Optional)</label>
                        <Textarea
                            placeholder="Write an epic caption..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="bg-black/50 border-white/[0.1] focus-visible:ring-indigo-500/50 resize-none min-h-[120px] text-zinc-200 placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {}
                <div className="p-5 border-t border-white/[0.06] bg-black/20 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isPublishing}
                        className="text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Publishing...
                            </>
                        ) : (
                            "Publish Post"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
