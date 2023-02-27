import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterModule } from "@angular/router";
import { AppComponent } from "./app.component";
import { HomeComponent } from "./home.component";

export const AppModule = (appConfig: { currentLang: { codice: string } }) => {
  @NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, RouterModule.forRoot(
      [
        {path: '', component: HomeComponent}
      ]
    ), BrowserAnimationsModule],
    providers: [],
    bootstrap: [AppComponent],
  })
  class Module {}
  return Module;
};
