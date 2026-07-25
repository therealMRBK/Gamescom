import { BUFFER_MINUTES } from "@/lib/constants";

export type AppointmentLike = {
  id: string;
  startTime: Date;
  endTime: Date;
  hall?: string | null;
  assignments: { userId: string }[];
};

export type ConflictWarning = {
  appointmentId: string;
  otherId: string;
  userId: string;
  type: "overlap" | "buffer";
  gapMinutes?: number;
};

/**
 * Overlap = same user assigned to two appointments whose time ranges intersect.
 * Buffer warning = same user, back-to-back appointments in different halls with
 * less than BUFFER_MINUTES between them.
 */
export function findConflicts(appointments: AppointmentLike[]): ConflictWarning[] {
  const warnings: ConflictWarning[] = [];

  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const a = appointments[i];
      const b = appointments[j];

      const sharedUsers = a.assignments
        .map((x) => x.userId)
        .filter((userId) => b.assignments.some((y) => y.userId === userId));

      if (sharedUsers.length === 0) continue;

      const overlap = a.startTime < b.endTime && b.startTime < a.endTime;

      for (const userId of sharedUsers) {
        if (overlap) {
          warnings.push({
            appointmentId: a.id,
            otherId: b.id,
            userId,
            type: "overlap",
          });
          continue;
        }

        const [earlier, later] = a.startTime <= b.startTime ? [a, b] : [b, a];
        const gapMs = later.startTime.getTime() - earlier.endTime.getTime();
        const gapMinutes = gapMs / 60000;
        const sameHall =
          earlier.hall && later.hall && earlier.hall === later.hall;

        if (!sameHall && gapMinutes >= 0 && gapMinutes < BUFFER_MINUTES) {
          warnings.push({
            appointmentId: a.id,
            otherId: b.id,
            userId,
            type: "buffer",
            gapMinutes: Math.round(gapMinutes),
          });
        }
      }
    }
  }

  return warnings;
}
