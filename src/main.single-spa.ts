import { enableProdMode, NgZone } from '@angular/core';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  singleSpaAngular,
  getSingleSpaExtraProviders,
} from 'single-spa-angular';
import { singleSpaPropsSubject } from './single-spa/single-spa-props';
import { environment } from './environments/environment';
import { AppModule } from './app/app.module';

/**
 * This is the main called in case of Single-Spa micro front end
 */

declare const Adsp: any;

if (environment.production) {
  enableProdMode();
}

const lifecycles = singleSpaAngular({
  bootstrapFunction: async (singleSpaProps) => {
    singleSpaPropsSubject.next(singleSpaProps);

    Adsp.versions['adsp-bpm'] = '{adsp-bpm-version}';

    const lang = await (
      Adsp.events.header.activeLanguage$ as Observable<{
        codice: string;
      }>
    )
      .pipe(take(1))
      .toPromise();

    return platformBrowserDynamic(getSingleSpaExtraProviders()).bootstrapModule(
      AppModule({ currentLang: lang })
    );
  },
  template: '<adsp-bpm-root id="adsp-bpm" />',
  Router,
  NgZone,
  domElementGetter: () =>
    document.getElementById('single-spa-application:main'),
});

export const bootstrap = lifecycles.bootstrap;
export const mount = [
  lifecycles.mount,
  async () => {
    Adsp.events.header.emitShowBpmHeader(true);
  },
];
export const unmount = [
  lifecycles.unmount,
  async () => {
    Adsp.events.header.emitShowBpmHeader(false);
  },
];
