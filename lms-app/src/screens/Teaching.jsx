/* ============================================================================
   TEACHING  (instructor / admin)
   The courses the signed-in user teaches (an instructor: the courses they
   are assigned to; an admin: every course), with how much work awaits
   review. Opens the course's instructor workspace.
   ============================================================================ */

import React, { useState, useEffect } from 'react';
import { T, F } from '../theme.js';
import { Btn, SectionHead, Loading, Empty, Card, Pill } from '../components/primitives.jsx';

export default function Teaching({ api, profile, onOpen }) {
  const [courses, setCourses] = useState(null);

  useEffect(() => {
    api.listTeaching().then(setCourses);
  }, [api]);

  if (!courses) return <Loading label="Loading your courses" />;

  return (
    <div>
      <SectionHead
        eyebrow="Instructor view"
        title="Teaching"
        sub={
          profile.role === 'admin'
            ? 'As an admin you can grade and manage every course.'
            : 'Courses you are assigned to. Other courses appear in the catalog as a learner.'
        }
      />
      {courses.length === 0 ? (
        <Empty label="You are not assigned to any courses yet." />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {courses.map((c) => (
            <Card key={c.courseId} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontFamily: F.heading, fontSize: 19, color: T.neutral900 }}>{c.title}</h3>
                  {c.pendingCount > 0 ? (
                    <Pill tone="accent">{c.pendingCount} awaiting review</Pill>
                  ) : (
                    <Pill>Queue clear</Pill>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: T.neutral500 }}>
                  {c.learnerCount} {c.learnerCount === 1 ? 'learner' : 'learners'} enrolled
                </div>
              </div>
              <Btn kind="dark" onClick={() => onOpen(c.courseId)}>
                Open
              </Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
