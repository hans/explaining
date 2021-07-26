FROM node AS frontend_builder

# Prepare dependencies
RUN mkdir /frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json /frontend/
RUN npm install

# Copy sources and assets
COPY frontend/. /frontend/

# Build experiment
ARG EXPERIMENT
RUN cd /frontend && npm run build experiments/${EXPERIMENT}

# ------

FROM cpllab/psiturk:3.2.0

RUN pip install names

COPY materials /materials
COPY psiturk /psiturk
RUN rm -f /psiturk/.psiturkconfig

# copy in frontend webpack script
ARG EXPERIMENT
COPY --from=frontend_builder /frontend/.jspsych-builder/experiments/${EXPERIMENT}/js/app.js /psiturk/static/js/app.js
COPY --from=frontend_builder /frontend/.jspsych-builder/experiments/${EXPERIMENT}/css/main.css /psiturk/static/css/app.css
