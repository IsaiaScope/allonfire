"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";

export function AnimatedPageWrapper({
  children,
  className = "space-y-6",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate="visible"
      className={className}
      initial="hidden"
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeInUp}>
      {children}
    </motion.div>
  );
}
