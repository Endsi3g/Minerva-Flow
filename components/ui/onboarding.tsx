"use client";

import type * as React from "react";
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  type PropsWithChildren,
} from "react";
import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const stepIndicatorVariants = cva("flex items-center justify-center gap-2", {
  variants: {
    variant: {
      dots: "",
      pills: "",
    },
  },
  defaultVariants: {
    variant: "dots",
  },
});

const stepDotVariants = cva("rounded-full transition-all duration-200", {
  variants: {
    variant: {
      dots: "size-2 data-[state=active]:size-2.5 data-[state=active]:bg-mv-green data-[state=completed]:bg-mv-green/60 data-[state=inactive]:bg-mv-ink/15",
      pills:
        "h-1 max-w-8 flex-1 rounded-full data-[state=active]:bg-mv-green data-[state=completed]:bg-mv-green/60 data-[state=inactive]:bg-mv-ink/15",
    },
  },
  defaultVariants: {
    variant: "dots",
  },
});

export interface StepIndicatorProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof stepIndicatorVariants>,
    VariantProps<typeof stepDotVariants> {
  /** Current step index (1-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Optional className for each step dot */
  dotClassName?: string;
}

/**
 * Headless step indicator primitive. Renders a list of step dots with
 * proper ARIA for progress indication.
 */
export function StepIndicator({
  currentStep,
  totalSteps,
  variant = "dots",
  className,
  dotClassName,
  ...props
}: StepIndicatorProps) {
  return (
    <div
      aria-label={`Étape ${currentStep} sur ${totalSteps}`}
      aria-valuemax={totalSteps}
      aria-valuemin={1}
      aria-valuenow={currentStep}
      className={cn(stepIndicatorVariants({ variant }), className)}
      data-slot="onboarding-step-indicator"
      role="progressbar"
      {...props}
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;
        let stepState: "active" | "completed" | "inactive" = "inactive";
        if (isActive) {
          stepState = "active";
        } else if (isCompleted) {
          stepState = "completed";
        }
        return (
          <div
            aria-current={isActive ? "step" : undefined}
            className={cn(stepDotVariants({ variant }), dotClassName)}
            data-slot="onboarding-step-dot"
            data-state={stepState}
            key={stepNumber}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Onboarding context + root
// ============================================================================

export interface OnboardingContextValue {
  currentStep: number;
  totalSteps: number;
  /** Sub-step value (e.g. feature carousel index within step 1) */
  stepValue: number;
  setStep: (step: number | ((prev: number) => number)) => void;
  setStepValue: (value: number | ((prev: number) => number)) => void;
  /** Max step value for current step (e.g. feature count - 1) */
  maxStepValue: number;
  canGoNext: boolean;
  canGoBack: boolean;
  handleBack: () => void;
  handleNext: () => void;
  handleComplete: () => void;
  onComplete?: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("Onboarding components must be used within Onboarding.Root");
  }
  return ctx;
}

export interface OnboardingRootProps
  extends PropsWithChildren,
    Omit<React.ComponentPropsWithoutRef<"div">, "children"> {
  /** Controlled step index (1-based) */
  value?: number;
  /** Default step index (uncontrolled) */
  defaultValue?: number;
  onValueChange?: (step: number) => void;
  stepValue?: number;
  defaultStepValue?: number;
  onStepValueChange?: (value: number) => void;
  totalSteps: number;
  /** Max sub-step value for step 1 (e.g. feature count - 1). Default 0 = no sub-steps */
  maxStepValue?: number;
  onComplete?: () => void;
  /** Custom logic for whether user can proceed. Receives (step, stepValue). Default: true */
  canGoNext?: (step: number, stepValue: number) => boolean;
}

function OnboardingRoot({
  value: controlledValue,
  defaultValue = 1,
  onValueChange,
  stepValue: controlledStepValue,
  defaultStepValue = 0,
  onStepValueChange,
  totalSteps,
  maxStepValue: controlledMaxStepValue = 0,
  onComplete,
  canGoNext: canGoNextFn,
  children,
  className,
  ...props
}: OnboardingRootProps) {
  const [currentStep, setCurrentStep] = useControllableState({
    prop: controlledValue,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const [stepValue, setStepValueState] = useControllableState({
    prop: controlledStepValue,
    defaultProp: defaultStepValue,
    onChange: onStepValueChange,
  });

  const maxStepValue = controlledMaxStepValue ?? 0;

  const canGoNext = canGoNextFn ? canGoNextFn(currentStep, stepValue) : true;

  const canGoBack = currentStep > 1 || stepValue > 0;

  const handleNext = useCallback(() => {
    if (currentStep === 1 && stepValue < maxStepValue) {
      setStepValueState((prev) => prev + 1);
    } else if (currentStep < totalSteps) {
      setStepValueState(0);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, stepValue, maxStepValue, totalSteps, setStepValueState, setCurrentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 1 && stepValue > 0) {
      setStepValueState((prev) => prev - 1);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setStepValueState(maxStepValue);
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, stepValue, maxStepValue, setStepValueState, setCurrentStep]);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const contextValue = useMemo<OnboardingContextValue>(
    () => ({
      currentStep,
      totalSteps,
      stepValue,
      setStep: setCurrentStep,
      setStepValue: setStepValueState,
      maxStepValue,
      canGoNext,
      canGoBack,
      handleBack,
      handleNext,
      handleComplete,
      onComplete,
    }),
    [
      currentStep,
      totalSteps,
      stepValue,
      setCurrentStep,
      setStepValueState,
      maxStepValue,
      canGoNext,
      canGoBack,
      handleBack,
      handleNext,
      handleComplete,
      onComplete,
    ]
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-sm",
          className
        )}
        data-slot="onboarding"
        data-state={`step-${currentStep}`}
        {...props}
      >
        {children}
      </div>
    </OnboardingContext.Provider>
  );
}

// ============================================================================
// Step
// ============================================================================

export interface OnboardingStepProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Step index (1-based) — content renders when currentStep matches */
  step: number;
}

function OnboardingStep({ step, children, className, ...props }: OnboardingStepProps) {
  const { currentStep } = useOnboarding();
  const isActive = currentStep === step;

  if (!isActive) {
    return null;
  }

  return (
    <div className={cn(className)} data-slot="onboarding-step" data-state="active" {...props}>
      {children}
    </div>
  );
}

// ============================================================================
// StepIndicator (connected)
// ============================================================================

export interface OnboardingStepIndicatorProps
  extends Omit<React.ComponentProps<typeof StepIndicator>, "currentStep" | "totalSteps"> {}

function OnboardingStepIndicator(props: OnboardingStepIndicatorProps) {
  const { currentStep, totalSteps } = useOnboarding();
  return <StepIndicator currentStep={currentStep} totalSteps={totalSteps} {...props} />;
}

// ============================================================================
// Header
// ============================================================================

export interface OnboardingHeaderProps extends React.ComponentPropsWithoutRef<"div"> {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

function OnboardingHeader({ title, description, children, className, ...props }: OnboardingHeaderProps) {
  if (children) {
    return (
      <div className={cn("text-center", className)} data-slot="onboarding-header" {...props}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 text-center",
        "[&_[data-slot=onboarding-title]]:font-display [&_[data-slot=onboarding-title]]:text-[22px] [&_[data-slot=onboarding-title]]:font-medium [&_[data-slot=onboarding-title]]:text-mv-ink",
        "[&_[data-slot=onboarding-description]]:text-[13px] [&_[data-slot=onboarding-description]]:text-mv-ink-soft",
        className
      )}
      data-slot="onboarding-header"
      {...props}
    >
      {title != null && <h2 data-slot="onboarding-title">{title}</h2>}
      {description && <p data-slot="onboarding-description">{description}</p>}
    </div>
  );
}

// ============================================================================
// Navigation
// ============================================================================

export interface OnboardingNavigationProps extends React.ComponentPropsWithoutRef<"fieldset"> {
  backLabel?: string;
  nextLabel?: string;
  completeLabel?: string;
  /** Override can go next (when not using Root's canGoNext) */
  canGoNext?: boolean;
  children?: React.ReactNode;
}

function OnboardingNavigation({
  backLabel = "Retour",
  nextLabel = "Suivant",
  completeLabel = "Commencer",
  canGoNext: canGoNextOverride,
  children,
  className,
  ...props
}: OnboardingNavigationProps) {
  const {
    currentStep,
    totalSteps,
    canGoNext: contextCanGoNext,
    canGoBack,
    handleBack,
    handleNext,
    handleComplete,
  } = useOnboarding();

  const canGoNext = canGoNextOverride ?? contextCanGoNext;
  const isLastStep = currentStep === totalSteps;

  if (children) {
    return (
      <fieldset className={cn("flex gap-3", className)} data-slot="onboarding-navigation" {...props}>
        {children}
      </fieldset>
    );
  }

  return (
    <fieldset
      aria-label="Navigation de l'accueil"
      className={cn("flex gap-3", className)}
      data-slot="onboarding-navigation"
      {...props}
    >
      <Button
        aria-label={backLabel}
        className={cn("flex-1", !canGoBack && "invisible")}
        data-slot="onboarding-back"
        disabled={!canGoBack}
        onClick={handleBack}
        variant="outline"
        type="button"
      >
        {backLabel}
      </Button>
      {isLastStep ? (
        <Button
          aria-label={completeLabel}
          className="flex-1"
          data-slot="onboarding-complete"
          disabled={!canGoNext}
          onClick={handleComplete}
          variant="primary"
          type="button"
        >
          {completeLabel}
        </Button>
      ) : (
        <Button
          aria-label={nextLabel}
          className="flex-1"
          data-slot="onboarding-next"
          disabled={!canGoNext}
          onClick={handleNext}
          variant="primary"
          type="button"
        >
          {nextLabel}
        </Button>
      )}
    </fieldset>
  );
}

// ============================================================================
// ChoiceGroup
// ============================================================================

type Orientation = "horizontal" | "vertical" | "grid";

interface ChoiceGroupContextValue {
  value: string | null;
  setValue: (value: string) => void;
  name: string;
  orientation: Orientation;
}

const ChoiceGroupContext = createContext<ChoiceGroupContextValue | null>(null);

function useChoiceGroup() {
  const ctx = useContext(ChoiceGroupContext);
  if (!ctx) {
    throw new Error("ChoiceGroup.Item must be used within ChoiceGroup");
  }
  return ctx;
}

export interface ChoiceGroupProps extends Omit<React.ComponentPropsWithoutRef<"div">, "defaultValue"> {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Name for radio group semantics (required for a11y) */
  name: string;
  orientation?: Orientation;
}

const choiceGroupOrientationClass: Record<Orientation, string> = {
  horizontal: "flex flex-wrap gap-2",
  vertical: "flex flex-col gap-2",
  grid: "grid grid-cols-2 gap-2",
};

function ChoiceGroupRoot({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  name,
  orientation = "grid",
  children,
  className,
  ...props
}: ChoiceGroupProps) {
  const [value, setValueState] = useControllableState({
    prop: controlledValue ?? undefined,
    defaultProp: defaultValue ?? null,
    onChange: (v) => v !== null && onValueChange?.(v),
  });

  const setValue = useCallback(
    (v: string) => {
      setValueState(v);
    },
    [setValueState]
  );

  const contextValue = useMemo<ChoiceGroupContextValue>(
    () => ({ value, setValue, name, orientation }),
    [value, setValue, name, orientation]
  );

  return (
    <ChoiceGroupContext.Provider value={contextValue}>
      <div
        aria-label={name}
        className={cn(choiceGroupOrientationClass[orientation], className)}
        data-orientation={orientation}
        data-slot="choice-group"
        role="radiogroup"
        {...props}
      >
        {children}
      </div>
    </ChoiceGroupContext.Provider>
  );
}

export interface ChoiceGroupItemProps extends React.ComponentPropsWithoutRef<"label"> {
  value: string;
}

function ChoiceGroupItemComponent({ value: itemValue, children, className, ...props }: ChoiceGroupItemProps) {
  const { value, setValue, name } = useChoiceGroup();
  const isSelected = value === itemValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.currentTarget.checked) {
        setValue(itemValue);
      }
    },
    [itemValue, setValue]
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-colors",
        isSelected
          ? "border-mv-green bg-mv-green/[0.08] text-mv-ink"
          : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft",
        className
      )}
      data-slot="choice-group-item"
      data-state={isSelected ? "selected" : "unselected"}
      {...props}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name={name}
        onChange={handleChange}
        type="radio"
        value={itemValue}
      />
      {children}
    </label>
  );
}

ChoiceGroupItemComponent.displayName = "ChoiceGroupItem";

export const ChoiceGroup = Object.assign(ChoiceGroupRoot, {
  Item: ChoiceGroupItemComponent,
});

// ============================================================================
// FeatureCarousel
// ============================================================================

interface FeatureCarouselContextValue {
  value: number;
  setValue: (value: number | ((prev: number) => number)) => void;
  totalItems: number;
  isActive: (index: number) => boolean;
}

const FeatureCarouselContext = createContext<FeatureCarouselContextValue | null>(null);

function useFeatureCarousel() {
  const ctx = useContext(FeatureCarouselContext);
  if (!ctx) {
    throw new Error("FeatureCarousel.Item must be used within FeatureCarousel");
  }
  return ctx;
}

export interface FeatureCarouselProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** Total number of items (derived from children if not provided) */
  totalItems?: number;
}

function FeatureCarouselRoot({
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  totalItems: totalItemsProp,
  children,
  className,
  ...props
}: FeatureCarouselProps) {
  const [value, setValue] = useControllableState({
    prop: controlledValue,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const totalItems = totalItemsProp ?? Children.count(children);

  const isActive = useCallback((index: number) => value === index, [value]);

  const contextValue = useMemo<FeatureCarouselContextValue>(
    () => ({ value, setValue, totalItems, isActive }),
    [value, setValue, totalItems, isActive]
  );

  return (
    <FeatureCarouselContext.Provider value={contextValue}>
      <div
        aria-label="Fonctionnalités"
        className={cn(className)}
        data-slot="feature-carousel"
        role="tablist"
        {...props}
      >
        {children}
      </div>
    </FeatureCarouselContext.Provider>
  );
}

export interface FeatureCarouselItemProps extends React.ComponentPropsWithoutRef<"button"> {
  /** Index of this item (0-based) */
  index: number;
}

function FeatureCarouselItemComponent({
  index,
  children,
  className,
  onClick,
  ...props
}: FeatureCarouselItemProps) {
  const { setValue, isActive, totalItems } = useFeatureCarousel();
  const active = isActive(index);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      setValue(index);
      onClick?.(e);
    },
    [index, setValue, onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (totalItems <= 1) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setValue((prev) => Math.min(prev + 1, totalItems - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setValue((prev) => Math.max(prev - 1, 0));
      }
    },
    [totalItems, setValue]
  );

  return (
    <button
      aria-selected={active}
      className={cn(className)}
      data-slot="feature-carousel-item"
      data-state={active ? "active" : "inactive"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

FeatureCarouselItemComponent.displayName = "FeatureCarouselItem";

export const FeatureCarousel = Object.assign(FeatureCarouselRoot, {
  Item: FeatureCarouselItemComponent,
});

// ============================================================================
// TipsList
// ============================================================================

export interface TipsListProps extends React.ComponentPropsWithoutRef<"div"> {
  title?: string;
}

function TipsListRoot({ title, children, className, ...props }: TipsListProps) {
  const titleId = useId();
  return (
    <div className={cn(className)} data-slot="tips-list" {...props}>
      {title && (
        <p className="sr-only" data-slot="tips-list-title" id={titleId}>
          {title}
        </p>
      )}
      <ol
        aria-label={title ? undefined : "Conseils"}
        aria-labelledby={title ? titleId : undefined}
        className="flex flex-col gap-2.5"
        data-slot="tips-list-items"
      >
        {children}
      </ol>
    </div>
  );
}

export interface TipsListItemProps extends React.ComponentPropsWithoutRef<"li"> {
  number?: number;
}

function TipsListItemComponent({ number, children, className, ...props }: TipsListItemProps) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-mv-border bg-mv-cream-soft px-3.5 py-2.5 text-[13px] text-mv-ink-soft",
        className
      )}
      data-number={number}
      data-slot="tips-list-item"
      {...props}
    >
      {number != null && (
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mv-green-dark text-[11px] font-semibold text-mv-cream-soft"
          data-slot="tips-list-item-number"
        >
          {number}
        </span>
      )}
      <span>{children}</span>
    </li>
  );
}

export const TipsList = Object.assign(TipsListRoot, {
  Item: TipsListItemComponent,
});

// ============================================================================
// Export
// ============================================================================

export const Onboarding = Object.assign(OnboardingRoot, {
  Step: OnboardingStep,
  StepIndicator: OnboardingStepIndicator,
  Header: OnboardingHeader,
  Navigation: OnboardingNavigation,
});
