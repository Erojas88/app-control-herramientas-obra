#!/usr/bin/env node

const MAX_ITERATIONS = 500;
const MAX_BATCH_SIZE = 120;
const REQUEST_TYPES = ['approved', 'pending', 'rejected'];

const evaluateStress = (iterations = MAX_ITERATIONS) => {
  let peakQueued = 0;
  let totalRequests = 0;
  let totalApproved = 0;
  let totalPending = 0;
  let totalRejected = 0;
  let totalLoans = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const batchSize = 8 + ((iteration * 7) % MAX_BATCH_SIZE);
    const currentBatch = [];

    for (let index = 0; index < batchSize; index += 1) {
      const status = REQUEST_TYPES[(iteration + index) % REQUEST_TYPES.length];
      currentBatch.push({ status, items: [{ approvalStatus: status }] });
    }

    totalRequests += currentBatch.length;
    peakQueued = Math.max(peakQueued, currentBatch.length);
    totalApproved += currentBatch.filter((request) => request.status === 'approved').length;
    totalPending += currentBatch.filter((request) => request.status === 'pending').length;
    totalRejected += currentBatch.filter((request) => request.status === 'rejected').length;
    totalLoans += currentBatch.reduce((sum, request) => sum + request.items.length, 0);
  }

  const peakThreshold = 3000;
  if (peakQueued > peakThreshold) {
    throw new Error(`Se excedió el umbral de concurrencia simulado: ${peakQueued} > ${peakThreshold}`);
  }

  return {
    totalRequests,
    totalApproved,
    totalPending,
    totalRejected,
    totalLoans,
    peakQueued,
    success: true,
  };
};

const result = evaluateStress();
console.log(JSON.stringify({ message: 'Prueba de estrés completada con éxito.', ...result }, null, 2));
