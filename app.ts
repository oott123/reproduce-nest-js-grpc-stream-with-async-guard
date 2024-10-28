import { CanActivate, Controller, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { GrpcMethod, GrpcStreamMethod, MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Observable, Subject } from "rxjs";

class AsyncGuard implements CanActivate {
  canActivate() {
    console.log('entering async guard')
    return new Promise<boolean>(resolve => {
      setTimeout(() => {
        console.log('leaving async guard')
        resolve(true)
      }, 100)
    })
  }
}

@Controller()
class HeroController {
  @GrpcStreamMethod('hero.HeroService', 'GetHero')
  public getHero(req: Observable<any>) {
    const sub = new Subject()

    console.log('entering controller')
    req.subscribe({
      next(message) {
        // NEVER TRIGGERED
        console.log('observed message', message)
        sub.next({ bar: 'world' })
        sub.complete()
      },
      complete() {
        console.log('request complete')
      }
    })

    return sub.asObservable()
  }
}

@Module({
  controllers: [HeroController],
  exports: [AsyncGuard],
  providers: [AsyncGuard]
})
class AppModule {}

async function run() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'hero',
      protoPath: 'hero/hero.proto',
    },
  })
  app.useGlobalGuards(app.get(AsyncGuard))
  app.listen()
}

run()
