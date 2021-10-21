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
ARG BUILD_PRODUCTION
RUN cd /frontend && \
        [ -z "$BUILD_PRODUCTION" ] \
                && npm run build-dev experiments/${EXPERIMENT} \
                || npm run build experiments/${EXPERIMENT}

# Extract experiment metadata as JSON
RUN cd /frontend && \
  node tools/extract_pragma.js src/experiments/${EXPERIMENT}.js \
    > /experiment.json

# ------

FROM cpllab/psiturk:3.2.0

# Install inotify-tools to support file watching and auto-reload during
# development
RUN apt update && apt install -y inotify-tools \
  && rm -rf /var/lib/apt/lists/*

RUN pip install names simplejson

COPY materials /materials
COPY psiturk /psiturk

# copy in frontend webpack script
ARG EXPERIMENT
COPY --from=frontend_builder /frontend/.jspsych-builder/experiments/${EXPERIMENT}/js/app.js /psiturk/static/js/app.js
COPY --from=frontend_builder /frontend/.jspsych-builder/experiments/${EXPERIMENT}/css/main.css /psiturk/static/css/app.css

# copy in experiment metadata
COPY --from=frontend_builder /experiment.json /experiment.json
# marshal into environment variable file readable by psiturk
COPY tools/write_pragma_env.py /write_pragma_env.py
RUN python /write_pragma_env.py < /experiment.json >> /psiturk/.env \
  && rm /write_pragma_env.py
