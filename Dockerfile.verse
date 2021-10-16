FROM rocker/verse:latest

RUN R -e "install.packages(c('Rcpp', 'lme4', 'lmerTest', 'brms', 'languageR', 'interactions', 'sjPlot'))"
