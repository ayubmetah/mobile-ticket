import { Injectable } from '@angular/core';
import { Router, ActivatedRoute, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Subscription } from 'rxjs';
import { Util } from '../util/util';
import { BranchService } from '../branch/branch.service';
import { BranchEntity } from '../entities/branch.entity';
declare var MobileTicketAPI: any;

@Injectable()
export class AuthGuard implements CanActivate {

    private prevUrl: string = '/';
    private branchService: BranchService;

    constructor(private router: Router, private activatedRoute: ActivatedRoute, private branchSrvc: BranchService) {
        this.branchService = branchSrvc;
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
        return new Promise((resolve, reject) => {
            var visitInfo = MobileTicketAPI.getCurrentVisit();
            let url = state.url;
            let branchId = route.queryParams['branch'];
            let visitId = route.queryParams['visit'];
            let checksum = route.queryParams['checksum'];


            if (url.startsWith('/branches')) {
                if (route.url.length === 2 && route.url[1].path) {
                    let id = route.url[1].path;
                    this.branchService.getBranchById(+id, (branchEntity: BranchEntity, isError: boolean) => {
                        if (!isError) {
                            MobileTicketAPI.getVisitStatus(
                                (visitObj: any) => {
                                    if (visitObj.status === "CALLED" || visitObj.visitPosition !== null) {
                                        resolve(true);
                                    }
                                    else {
                                        MobileTicketAPI.setBranchSelection(branchEntity);
                                        this.router.navigate(['services']);
                                        resolve(false);
                                    }
                                },
                                (xhr, status, msg) => {
                                    MobileTicketAPI.setBranchSelection(branchEntity);
                                    this.router.navigate(['services']);
                                    resolve(false);
                                }
                            );
                        }
                        else {
                            let e = 'error';
                            this.router.navigate(['no_branch']);
                            resolve(false);
                        }                       
                    });
                }
                else {
                    resolve(true);
                }

            }
            else if (url.startsWith('/services')) {
                if ((this.prevUrl.startsWith('/branches') ||
                    this.prevUrl === '/')) {
                    resolve(true);
                }
                else if (this.prevUrl.startsWith('/ticket') &&
                    (!visitInfo || visitInfo === null)) {
                    resolve(true);
                }
                else if ((visitInfo && visitInfo !== null)) {
                    this.router.navigate(['/branches']);
                    resolve(false);
                }
            }

            else if ((url.startsWith('/ticket') && ((branchId && visitId && checksum) ||
                ((visitInfo !== null && visitInfo) && visitInfo.branchId && visitInfo.visitId && visitInfo.checksum)))) {
                resolve(true);
            }
            else if (visitInfo) {
                MobileTicketAPI.getVisitStatus(
                    (visitObj: any) => {
                        if (visitObj.status === "CALLED" || visitObj.visitPosition !== null) {
                            resolve(true);
                        }
                        else {
                            this.router.navigate(['/branches']);
                            resolve(false);
                        }
                    },
                    (xhr, status, msg) => {
                        this.router.navigate(['/branches']);
                        resolve(false);
                    }
                );
            }
            else {
                this.router.navigate(['/branches']);
                resolve(false);
            }

            if (!(this.prevUrl.startsWith('/branches') && url.startsWith('/ticket'))) {
                this.prevUrl = url;
            }

        });
    }
}
