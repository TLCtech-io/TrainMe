/* ============================================================================
   ROOT
   Owns the session and top-level navigation: sign-in, then the role-scoped
   shell. Catalog and Transcript are the learner side (every role can take
   courses); Teaching is the instructor side (instructors and admins).

   The session lives in a ref the api reads through getSession(), so identity
   always comes from the signed-in session (playbook 10.2), never a lookup.
   ============================================================================ */

import React, { useState, useRef, useEffect } from 'react';
import { createApi } from './api/index.js';
import Shell from './components/Shell.jsx';
import SignIn from './screens/SignIn.jsx';
import Catalog from './screens/Catalog.jsx';
import CourseHome from './screens/CourseHome.jsx';
import Transcript from './screens/Transcript.jsx';
import Teaching from './screens/Teaching.jsx';
import TeachCourse from './screens/TeachCourse.jsx';

export default function App() {
  const sessionRef = useRef(null);
  // Lazy init: one api (and one mock store) for the life of the app.
  const [api] = useState(() => createApi(() => sessionRef.current));

  const [session, setSession] = useState(null); // {token, profile}
  const [tab, setTab] = useState('catalog');
  const [openCourse, setOpenCourse] = useState(null); // learner course page
  const [teachCourse, setTeachCourse] = useState(null); // instructor workspace

  const goTab = (id) => {
    setTab(id);
    setOpenCourse(null);
    setTeachCourse(null);
  };
  const onSignedIn = (token, profile) => {
    sessionRef.current = { token, profile };
    setSession({ token, profile });
    goTab('catalog');
  };
  const onSignOut = () => {
    sessionRef.current = null;
    setSession(null);
    goTab('catalog');
  };

  // Every screen opens at the top, not at the previous screen's scroll
  // position (DST playbook 10.17).
  useEffect(() => window.scrollTo(0, 0), [tab, openCourse, teachCourse]);

  if (!session) return <SignIn api={api} onSignedIn={onSignedIn} />;

  let screen;
  if (tab === 'teaching') {
    screen = teachCourse ? (
      <TeachCourse api={api} courseId={teachCourse} onExit={() => setTeachCourse(null)} />
    ) : (
      <Teaching api={api} profile={session.profile} onOpen={setTeachCourse} />
    );
  } else if (openCourse) {
    screen = <CourseHome api={api} courseId={openCourse} onExit={() => setOpenCourse(null)} />;
  } else if (tab === 'catalog') {
    screen = <Catalog api={api} onOpen={setOpenCourse} />;
  } else {
    screen = <Transcript api={api} profile={session.profile} />;
  }

  return (
    <Shell profile={session.profile} onSignOut={onSignOut} tab={tab} setTab={goTab}>
      {screen}
    </Shell>
  );
}
