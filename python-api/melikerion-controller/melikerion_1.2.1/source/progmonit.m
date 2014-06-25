%PROGMONIT  Print progress messages on screen.
%   ST = PROGMONIT(NAME, STAGE, DT, ST)
%   NAME  Name of function.
%   STAGE Stage of progress (from 0 to 1).
%   DT    Time interval between messages.
%   ST    Internal state of the monitor.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function st = progmonit(name, stage, dt, st);
if nargin < 3; dt = 5; end
if nargin < 4; st = []; end

% Start counter.
if isempty(st)
  st.init = rem(now, 1)*24*60*60;
  st.start = st.init;
  st.rotor = 0;
  st.report = 0;
end

% End message.
if st.report & (stage >= 1)
  gap = (rem(now, 1)*24*60*60 - st.init);
  eta = sprintf('Time: %.0f s', max(0, gap));
  if gap >= 60
    mins = floor(gap/60); secs = (gap - mins*60);
    eta = sprintf('Time: %.0f min %.0f s', mins, secs);
  end
  if gap >= 600; eta = sprintf('ETA: %.0f min', gap/60); end
  if gap >= 3600
    hrs = floor(gap/3600); mins = (gap/60 - hrs*60);
    eta = sprintf('Time: %.0f h %.0f min', hrs, mins);
  end
  if gap >= 36000; eta = sprintf('Time: %.0f h', gap/3600); end
  s = sprintf('\r%s 100%% %s', name, eta);    
  fprintf(1, '%-78s\n', s);
  st.start = NaN;
  st.report = 0;
  return;
end

% Print message.
lag = (rem(now, 1)*24*60*60 - st.start);
if lag > dt
  st.start = rem(now, 1)*24*60*60;
  st.rotor = mod(st.rotor, 3);
  st.report = 1;
  switch st.rotor
  case 0
    s = sprintf('\r%s %2d%% *-- ', name, floor(100*stage));    
  case 1
    s = sprintf('\r%s %2d%% -*- ', name, floor(100*stage));
  case 2
    s = sprintf('\r%s %2d%% --* ', name, floor(100*stage));
  end
  st.rotor = (st.rotor + 1);
  
  t = (rem(now, 1)*24*60*60 - st.init);
  if (t > 5*dt) & (stage > 1e-10)
    gap = (1 - stage)/stage*t;
    eta = sprintf('ETA: %.0f s', gap);
    if gap >= 60
      mins = floor(gap/60); secs = (gap - mins*60);
      eta = sprintf('ETA: %.0f min %.0f s', mins, secs);
    end
    if gap >= 600; eta = sprintf('ETA: %.0f min', gap/60); end
    if gap >= 3600
      hrs = floor(gap/3600); mins = (gap/60 - hrs*60);
      eta = sprintf('ETA: %.0f h %.0f min', hrs, mins);
    end
    if gap >= 36000; eta = sprintf('ETA: %.0f h', gap/3600); end
    s = [s eta];
  end

  fprintf(1, '%-78s', s);
end

return;
