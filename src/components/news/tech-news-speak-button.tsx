"use client";

import { Button } from "@/components/ui/button";
import { Loader2Icon, PauseIcon, Volume2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function TechNewsSpeakButton() {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [loading, setLoading] = useState(false);
	const [playing, setPlaying] = useState(false);

	useEffect(() => {
		const audio = new Audio();
		audioRef.current = audio;

		const onPlaying = () => {
			setLoading(false);
			setPlaying(true);
		};
		const onPause = () => setPlaying(false);
		const onEnded = () => {
			setPlaying(false);
			setLoading(false);
		};
		const onError = () => {
			audio.removeAttribute("src");
			audio.load();
			setPlaying(false);
			setLoading(false);
		};

		audio.addEventListener("playing", onPlaying);
		audio.addEventListener("pause", onPause);
		audio.addEventListener("ended", onEnded);
		audio.addEventListener("error", onError);

		return () => {
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
			audio.removeEventListener("playing", onPlaying);
			audio.removeEventListener("pause", onPause);
			audio.removeEventListener("ended", onEnded);
			audio.removeEventListener("error", onError);
		};
	}, []);

	function toggle() {
		const audio = audioRef.current;
		if (!audio || loading) {
			return;
		}

		if (playing) {
			audio.pause();
			return;
		}

		if (audio.getAttribute("src")) {
			void audio.play();
			return;
		}

		setLoading(true);
		audio.src = "/api/news/tech/audio";
		void audio.play().catch(() => {
			setLoading(false);
			setPlaying(false);
		});
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			aria-label={playing ? "Pause tech news" : "Listen to tech news"}
			onClick={toggle}
			className="-my-0.5 text-foreground/50 hover:text-foreground"
		>
			{loading ? (
				<Loader2Icon className="animate-spin" />
			) : playing ? (
				<PauseIcon />
			) : (
				<Volume2Icon />
			)}
		</Button>
	);
}
