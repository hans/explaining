FROM cpllab/psiturk:3.2.0

COPY materials /materials
COPY psiturk /psiturk
RUN rm /psiturk/.psiturkconfig
