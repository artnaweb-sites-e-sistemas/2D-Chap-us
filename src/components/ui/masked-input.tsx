'use client';

import * as React from "react"
import { InputMask } from "@react-input/mask"
import { cn } from "@/lib/utils"

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'mask'> {
    mask: string;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
    ({ className, mask, ...props }, ref) => {
        return (
            <InputMask
                mask={mask}
                replacement={{ _: /\d/ }}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref as any}
                {...(props as any)}
            />
        )
    }
)
MaskedInput.displayName = "MaskedInput"

export { MaskedInput }
