import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ELEMENT_TO_MINIGAME, MINIGAME_TYPES } from "@shared/constants";

interface MinigamesProps {
  type: string;
  onComplete: (accuracy: number) => void;
  onCancel: () => void;
}

export function Minigames({ type, onComplete, onCancel }: MinigamesProps) {
  const [accuracy, setAccuracy] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  const minigameType = ELEMENT_TO_MINIGAME[type as keyof typeof ELEMENT_TO_MINIGAME] || MINIGAME_TYPES.TIMING_STRIKE;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    onComplete(accuracy);
    setIsComplete(true);
  };

  const renderMinigame = () => {
    switch (minigameType) {
      case MINIGAME_TYPES.TIMING_STRIKE:
        return <TimingStrike accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      case MINIGAME_TYPES.PATTERN_MATCH:
        return <PatternMatch accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      case MINIGAME_TYPES.RAPID_TAP:
        return <RapidTap accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      case MINIGAME_TYPES.HOLD_RELEASE:
        return <HoldAndRelease accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      case MINIGAME_TYPES.QUICK_REACTION:
        return <QuickReaction accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      case MINIGAME_TYPES.SEQUENCE_INPUT:
        return <SequenceInput accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
      default:
        return <TimingStrike accuracy={accuracy} setAccuracy={setAccuracy} onComplete={handleComplete} />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{minigameType}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Time Remaining: {timeLeft}s</p>
            <Progress value={(5 - timeLeft) * 20} max={100} />
          </div>

          <div className="min-h-64 flex items-center justify-center">{renderMinigame()}</div>

          <div className="text-center">
            <p className="text-lg font-bold">Accuracy: {Math.round(accuracy * 100)}%</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleComplete} disabled={isComplete}>
              {isComplete ? "Complete" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimingStrike({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [fillPercentage, setFillPercentage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setFillPercentage((prev) => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const handleClick = () => {
    const distance = Math.abs(fillPercentage - 100);
    const calculatedAccuracy = Math.max(0, 1 - distance / 100);
    setAccuracy(calculatedAccuracy);
    setIsAnimating(false);
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">Fill the bar and click at 100%</p>
      </div>
      <div className="w-full bg-secondary rounded-full h-12 overflow-hidden">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${fillPercentage}%` }}
        />
      </div>
      <p className="text-center font-bold">{Math.round(fillPercentage)}%</p>
      <Button className="w-full" onClick={handleClick}>
        Click!
      </Button>
    </div>
  );
}

function PatternMatch({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [pattern] = useState([0, 2, 1, 2, 0]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500"];

  const handleClick = (index: number) => {
    const newPattern = [...userPattern, index];
    setUserPattern(newPattern);

    if (newPattern[newPattern.length - 1] !== pattern[newPattern.length - 1]) {
      const calculatedAccuracy = newPattern.length / pattern.length;
      setAccuracy(calculatedAccuracy);
    } else if (newPattern.length === pattern.length) {
      setAccuracy(1);
    }
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">Repeat the color pattern</p>
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color, idx) => (
          <button
            key={idx}
            className={`${color} h-16 rounded-lg hover:opacity-80 transition-opacity`}
            onClick={() => handleClick(idx)}
          />
        ))}
      </div>
      <p className="text-center text-sm">{userPattern.length} / {pattern.length}</p>
    </div>
  );
}

function RapidTap({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [taps, setTaps] = useState(0);
  const maxTaps = 30;

  const handleTap = () => {
    const newTaps = taps + 1;
    setTaps(newTaps);
    setAccuracy(Math.min(1, newTaps / maxTaps));
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">Tap as fast as you can!</p>
      <Button className="w-full h-32 text-4xl" onClick={handleTap}>
        TAP
      </Button>
      <p className="text-center font-bold">{taps} / {maxTaps} taps</p>
    </div>
  );
}

function HoldAndRelease({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdTime, setHoldTime] = useState(0);
  const targetTime = 2000;

  useEffect(() => {
    if (!isHolding) return;

    const interval = setInterval(() => {
      setHoldTime((prev) => prev + 10);
    }, 10);

    return () => clearInterval(interval);
  }, [isHolding]);

  const handleRelease = () => {
    setIsHolding(false);
    const distance = Math.abs(holdTime - targetTime);
    const calculatedAccuracy = Math.max(0, 1 - distance / targetTime);
    setAccuracy(calculatedAccuracy);
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">Hold for exactly 2 seconds</p>
      <Button
        className="w-full h-32 text-4xl"
        onMouseDown={() => setIsHolding(true)}
        onMouseUp={handleRelease}
        onTouchStart={() => setIsHolding(true)}
        onTouchEnd={handleRelease}
      >
        HOLD
      </Button>
      <p className="text-center font-bold">{(holdTime / 1000).toFixed(1)}s / 2.0s</p>
    </div>
  );
}

function QuickReaction({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [showSignal, setShowSignal] = useState(false);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [startTime] = useState(Date.now() + 1000);

  useEffect(() => {
    const timer = setTimeout(() => setShowSignal(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    if (!showSignal) return;
    const time = Date.now() - startTime;
    setReactionTime(time);
    const calculatedAccuracy = Math.max(0, 1 - time / 500);
    setAccuracy(calculatedAccuracy);
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">Click as soon as you see GO!</p>
      {showSignal ? (
        <Button className="w-full h-32 text-4xl bg-green-600 hover:bg-green-700" onClick={handleClick}>
          GO!
        </Button>
      ) : (
        <div className="w-full h-32 bg-secondary rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Wait...</p>
        </div>
      )}
      {reactionTime && <p className="text-center font-bold">{reactionTime}ms</p>}
    </div>
  );
}

function SequenceInput({
  accuracy,
  setAccuracy,
  onComplete,
}: {
  accuracy: number;
  setAccuracy: (acc: number) => void;
  onComplete: () => void;
}) {
  const [sequence] = useState(["A", "B", "C", "A", "B"]);
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const buttons = ["A", "B", "C", "D"];

  const handleClick = (btn: string) => {
    const newSequence = [...userSequence, btn];
    setUserSequence(newSequence);

    if (newSequence[newSequence.length - 1] !== sequence[newSequence.length - 1]) {
      const calculatedAccuracy = newSequence.length / sequence.length;
      setAccuracy(calculatedAccuracy);
    } else if (newSequence.length === sequence.length) {
      setAccuracy(1);
    }
  };

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-muted-foreground text-center">Enter the sequence</p>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map((btn) => (
          <Button key={btn} className="h-16 text-2xl" onClick={() => handleClick(btn)}>
            {btn}
          </Button>
        ))}
      </div>
      <p className="text-center text-sm">{userSequence.join(" ")} / {sequence.join(" ")}</p>
    </div>
  );
}
