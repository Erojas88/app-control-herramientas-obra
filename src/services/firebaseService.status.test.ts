import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRequestStatus,
  normalizeApprovalStatus,
  normalizeRequestStatus,
  summarizeInventory,
} from './firebaseService';
import { loginWithEmailAndPassword } from './firebaseAuthService';
import { buildRequesterAccessUrl, getGuestSessionIdFromUrl } from '../utils/quickAccess';

test('deriveRequestStatus marks a request as rejected when all items are rejected', () => {
  const result = deriveRequestStatus([
    { approvalStatus: 'rejected' },
    { approvalStatus: 'rejected' },
  ]);

  assert.equal(result, 'rejected');
});

test('deriveRequestStatus keeps a request pending when at least one item is still pending', () => {
  const result = deriveRequestStatus([
    { approvalStatus: 'approved' },
    { approvalStatus: 'pending' },
  ]);

  assert.equal(result, 'pending');
});

test('normalizeApprovalStatus and normalizeRequestStatus treat Spanish and English values consistently', () => {
  assert.equal(normalizeApprovalStatus('rechazado'), 'rejected');
  assert.equal(normalizeApprovalStatus('rejected'), 'rejected');
  assert.equal(normalizeApprovalStatus('aprobado'), 'approved');
  assert.equal(normalizeApprovalStatus('approved'), 'approved');

  assert.equal(normalizeRequestStatus('rechazado'), 'rejected');
  assert.equal(normalizeRequestStatus('rejected'), 'rejected');
  assert.equal(normalizeRequestStatus('aprobado'), 'approved');
  assert.equal(normalizeRequestStatus('approved'), 'approved');
});

test('a request with all rejected items should not remain in pending approval list', () => {
  const items = [
    { approvalStatus: 'rejected' },
    { approvalStatus: 'rejected' },
  ];

  const requestStatus = deriveRequestStatus(items);
  const isStillPending = requestStatus === 'pending';

  assert.equal(isStillPending, false);
  assert.equal(normalizeRequestStatus(requestStatus), 'rejected');
});

test('demo jefe de obra can sign in without Firebase profile fallback', async () => {
  const result = await loginWithEmailAndPassword('jefe@demo', 'demo1234');

  assert.equal(result.ok, true);
  assert.equal(result.user?.role, 'jefe_obra');
  assert.equal(result.user?.email, 'jefe@demo');
});

test('multi-item requests stay pending until every item is resolved and are rejected when all 3 items are rejected', () => {
  const mixedRequest = [
    { approvalStatus: 'approved' },
    { approvalStatus: 'pending' },
    { approvalStatus: 'rejected' },
  ];

  const fullyRejectedRequest = [
    { approvalStatus: 'rejected' },
    { approvalStatus: 'rejected' },
    { approvalStatus: 'rejected' },
  ];

  assert.equal(deriveRequestStatus(mixedRequest), 'pending');
  assert.equal(deriveRequestStatus(fullyRejectedRequest), 'rejected');
  assert.equal(normalizeRequestStatus(deriveRequestStatus(fullyRejectedRequest)), 'rejected');
  assert.equal(normalizeRequestStatus('rechazado'), 'rejected');
  assert.equal(normalizeRequestStatus('aprobado'), 'approved');

  const requestStatus = deriveRequestStatus(fullyRejectedRequest);
  const isStillPending = requestStatus === 'pending';

  assert.equal(isStillPending, false);
  assert.equal(requestStatus, 'rejected');
});

test('dashboard inventory counts should reflect actual tool status after a return', () => {
  const tools = [
    { id: 'T-1', status: 'available' },
    { id: 'T-2', status: 'loaned' },
    { id: 'T-3', status: 'maintenance' },
  ];

  const requests = [{
    status: 'approved',
    items: [{
      approvalStatus: 'approved',
      toolId: 'T-2',
      dueDate: '2026-01-01',
      returnedAt: '2026-11-02T00:00:00.000Z',
    }],
  }];

  const summary = summarizeInventory(tools, requests);

  assert.equal(summary.available, 1);
  assert.equal(summary.loaned, 1);
  assert.equal(summary.damaged, 1);
  assert.equal(summary.approved, 1);
});

test('public QR guest access keeps a temporary session token in the URL', () => {
  const guestId = 'guest-1720000000000-abc123';
  const url = buildRequesterAccessUrl('https', guestId);

  assert.equal(getGuestSessionIdFromUrl(url), guestId);
  assert.match(url, /guestSessionId=guest-1720000000000-abc123/);
});
