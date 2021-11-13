FROM rocker/verse:latest

RUN R -e "install.packages(c('Rcpp', 'lme4', 'lmerTest', 'brms', 'languageR', 'interactions', 'sjPlot', 'ggbeeswarm'))"
RUN R -e "devtools::install_github('crsh/papaja@devel')"
RUN install2.r tidybayes broom broom.mixed
RUN install2.r magick png

# Development stuff
RUN R -e "install.packages('boomer')"
