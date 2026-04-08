#!/usr/bin/env node
// Performance monitoring script
// Run this periodically to log performance metrics

import { PerformanceMonitor } from "../src/lib/performance/monitor.js";

console.log("Logging performance metrics...");
PerformanceMonitor.logMetrics();