import { Variants } from "framer-motion";

// ============================================
// ANIMATION VARIANTS LIBRARY
// ============================================

// 1. FADE ANIMATIONS
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// 2. SCALE ANIMATIONS
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

// 3. SLIDE ANIMATIONS
export const slideInFromLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export const slideInFromRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

export const slideInFromBottom: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// 4. STAGGER CONTAINER (for lists/grids)
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

// 5. STAGGER CHILDREN
export const staggerItem: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const staggerItemScale: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

// 6. CARD ANIMATIONS
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

export const cardHoverGlow = {
  rest: { 
    scale: 1, 
    y: 0,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
  },
  hover: { 
    scale: 1.02, 
    y: -4,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

// 7. PAGE TRANSITIONS
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const pageSlideIn: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    x: -50,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

// 8. FLOATING ANIMATION (for decorative elements)
export const float: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const floatSlow: Variants = {
  animate: {
    y: [0, -15, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// 9. PULSE ANIMATION
export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export const pulseGlow: Variants = {
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(34, 197, 94, 0.4)",
      "0 0 0 10px rgba(34, 197, 94, 0)",
      "0 0 0 0 rgba(34, 197, 94, 0)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// 10. SHAKE ANIMATION (for errors/attention)
export const shake: Variants = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 }
  }
};

// 11. BLUR IN
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// 12. ROTATE IN
export const rotateIn: Variants = {
  hidden: { opacity: 0, rotate: -10, scale: 0.9 },
  visible: { 
    opacity: 1, 
    rotate: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// 13. TAB CONTENT ANIMATION
export const tabContent: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
};

// 14. COUNTER ANIMATION (for numbers)
export const counterAnimation = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Create delayed variant
export function withDelay(variants: Variants, delay: number): Variants {
  return {
    ...variants,
    visible: {
      ...(variants.visible as object),
      transition: {
        ...((variants.visible as any)?.transition || {}),
        delay
      }
    }
  };
}

// Create custom stagger
export function createStagger(staggerDelay: number = 0.1, initialDelay: number = 0): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay
      }
    }
  };
}

// ============================================
// ANIMATION PRESETS FOR SPECIFIC COMPONENTS
// ============================================

export const heroAnimation = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  },
  title: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  },
  subtitle: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  },
  cta: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  }
};

export const dashboardAnimation = {
  header: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  },
  stats: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  },
  statCard: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    }
  },
  content: {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, delay: 0.3 }
    }
  }
};

export const formAnimation = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  },
  field: {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  },
  button: {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, delay: 0.2 }
    }
  }
};

export const listAnimation = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  },
  item: {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  }
};

export const modalAnimation = {
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  },
  content: {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2 }
    }
  }
};
