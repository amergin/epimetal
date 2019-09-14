(function(context) {
  var root = {};

  root.dispSize = function(title, matrix) {
    var isArray = function(d) {
      return _.isArray(d);
    };
    console.log(title + ": ", isArray(matrix) ? _.size(matrix) : 1, " x ", isArray(matrix[0]) ? _.size(matrix[0]) : 1);
  };

  root.getNaNIndices = function(data) {
    var nans = [],
      val;
    for (var i = 0; i < data.length; ++i) {
      val = +data[i];
      if (_.isNaN(val)) {
        nans.push(i);
      }
    }
    return nans;
  };

  root.stripNaNs = function(data, indices) {
    return _.filter(data, function(d, ind) {
      return !_.contains(indices, ind);
    });
  };

  root.getStrippedAdjust = function(data, nanIndices) {
    var ret = [];
    _.each(data, function(array) {
      var copy = array.slice(0);
      ret.push(root.stripNaNs(copy, nanIndices));
    });
    return ret;
  };

  root.getNormalizedData = function(data) {
    var process = function(array) {
      if(array.length === 0) { return []; }

      var ret = [],
      avg = mathUtils.mean(array),
      stDev = mathUtils.stDeviation(array, avg, function(d) { return +d; });
      if(stDev === 0) {
        // all sample values are the same, constant variable -> error
        throw new Error('Constant variable');
      }
      for(var i = 0; i < array.length; ++i) {
        ret.push( (+array[i] - avg)/stDev );
      }
      return ret;
    };

    var normalized = [];
    // matrix = array with vertical columns
    if( _.isArray(data[0]) ) {
      _.each(data, function(array) {
        normalized.push( process(array) );
      });
    } else {
      normalized = process(data);
    }
    return normalized;
  };

  root.prepareRegressionData = function(columns, add_constant, normalize) {

    var nrows = 0;

    if(normalize === undefined) {
      normalize = true;
    }

    if(add_constant === undefined) {
      add_constant = false;
    }

    if(columns === undefined) {
      throw new Error('No columns supplied');
    }

    if(columns.constructor !== Array) {
      throw new Error('Parameter is not an Array');
    }

    if(columns.length === 0) {
      throw new Error('Empty array');
    }

    if(columns[0].constructor !== Array) {
      columns = [columns];
    }


    for(var i = 0; i<columns.length; i++) {
      if(nrows < columns[i].length) {
        nrows = columns[i].length;
      }
    }

    ncols = columns.length;

    
    var offset = 0,
    avg, stDev, 
    accessor = function(d) { return +d; };


    if(add_constant) {
      offset = 1;
    } 

    ret = new Float32Array(nrows * (ncols + offset));

    for(var ii=0; ii<ncols; ii++) {
    
      avg = mathUtils.mean(columns[ii]);
      stDev = mathUtils.stDeviation(columns[ii], avg, accessor);
      
      if(stDev === 0) {
        // console.log(columns[ii]);
        // all sample values are the same, constant variable -> error
        throw new Error('Constant variable');
      }

      if(normalize) {

        for(var j=0; j<columns[ii].length; j++) {

          ret[j*(ncols+offset) + ii + offset] = (+columns[ii][j] - avg) / stDev;
        }

      } else {

        for(var k=0; k<columns[ii].length; k++) {

          ret[k*(ncols+offset) + ii + offset] = (+columns[ii][k] ) ;
        }
        

      }

    }

    if(add_constant) {
      for(var l = 0; l<nrows; l++) {
        ret[l*(ncols+1)] = 1;
      }
    }
      
    return ret;


  };

  function _matrixInvOfChol(mtx, n) {

    _matrixCholDecomp(mtx, n);

    
    var sum = 0;

    for(var i=0; i<n; i++) {
      mtx[i*n+i] = 1.00 / mtx[i*n+i];
      for(var j=i+1; j<n; j++) {
        sum = 0;
        for(var k=i; k<j; k++) {
          sum = sum - mtx[j*n+k] * mtx[k*n+i];
        }
        mtx[j*n+i] = sum / mtx[j*n+j];
      }

    }

    


    /*

    ! -----------------------------------------------------
    !     Inverse of Cholesky decomposition.

    !     input    n  size of matrix
    !     input    A  Symmetric positive def. matrix
    !     output  aa  inverse of lower decomposed matrix
    !     uses        _matrixCholDecomp(int,MAT,VEC)         
    ! -----------------------------------------------------
    Subroutine _matrixInvOfChol(n,A,aa)
      integer n
      real*8 A(0:n-1,0:n-1), aa(0:n-1,0:n-1)
      integer i,j,k, ialloc
      real*8 sum
      real*8, pointer :: p(:)
      allocate(p(0:n-1),stat=ialloc)

      aa = A

      call _matrixCholDecomp(n, aa, p)

      do i = 0, n-1
        aa(i,i) = 1.d0 / p(i)
        do j = i + 1, n-1
          sum = 0.d0
          do k = i, j-1
          sum = sum - aa(j,k) * aa(k,i)
          end do
          aa(j,i) = sum / p(j)
        end do
      end do
      deallocate(p)
      return
    End
    */
  }

  root.matrixMultiply = function(mtxA, nrowsA, ncolsA, mtxB, nrowsB, ncolsB) {
    if (ncolsA != nrowsB) {
      throw "error: incompatible sizes";
    }


    result = new Float32Array(nrowsA * ncolsB);


    for (var i = 0; i < nrowsA; i++) {
      
      
      for (var j = 0; j < ncolsB; j++) {
        
        var sum = 0;
        
        for (var k = 0; k < ncolsA; k++) {
            sum += mtxA[i*ncolsA+k] * mtxB[k*ncolsB+j];
        }

        result[i * ncolsB + j] = sum;
      }

    }
    
    return result;
    
  };

  root.matrixScaleInPlace = function(mtxA, nrowsA, ncolsA, scale) {

    for (var i = 0; i < nrowsA; i++) {
      
      
      for (var j = 0; j < ncolsA; j++) {
        
        mtxA[i*ncolsA+j] = scale * mtxA[i*ncolsA+j];

      }

    }

  };

  root.matrixSubtractInPlace = function(mtxA, nrowsA, ncolsA, mtxB, nrowsB, ncolsB) {
    if (nrowsA != nrowsB || ncolsA != ncolsB) {
      throw "error: incompatible sizes";
    }

    for (var i = 0; i < nrowsA; i++) {
      
      
      for (var j = 0; j < ncolsA; j++) {
        
        mtxA[i*ncolsA+j] = mtxA[i*ncolsA+j] - mtxB[i*ncolsA+j];

      }

    }
  };

  root.matrixMultiplyTrA = function(mtxA, nrowsA, ncolsA, mtxB, nrowsB, ncolsB) {
    if (nrowsA != nrowsB) {
      throw "error: incompatible sizes";
    }

    result = new Float32Array(ncolsA * ncolsB);
    for (var i = 0; i < ncolsA; i++) {
      
      
      for (var j = 0; j < ncolsB; j++) {
        
        var sum = 0;
        
        for (var k = 0; k < nrowsA; k++) {
            sum += mtxA[k*ncolsA+i] * mtxB[k*ncolsB+j];
        }

        result[i * ncolsB + j] = sum;
      }

    }
    return result;
  };

  root.matrixMultiplyTrB = function(mtxA, nrowsA, ncolsA, mtxB, nrowsB, ncolsB) {
    if (ncolsA != ncolsB) {
      throw "error: incompatible sizes";
    }

    result = new Float32Array(nrowsA * nrowsB);
    for (var i = 0; i < nrowsA; i++) {
      
      
      for (var j = 0; j < nrowsB; j++) {
        
        var sum = 0;
        
        for (var k = 0; k < ncolsA; k++) {
            sum += mtxA[i*ncolsA+k] * mtxB[j*ncolsB+k];
        }

        result[i * nrowsB + j] = sum;
      }

    }
    return result;
  };

  root.matrixInnerProduct = function(mtx, nrows, ncols) {
    if(mtx === undefined) {
      throw new Error('No matrix supplied');
    }

    if(ncols === undefined) {
      throw new Error('No number of columns supplied');
    }

    if(nrows === undefined) {
      throw new Error('No number of rows supplied');
    }

    retval = new Float32Array(ncols*ncols);

    var sum = 0;

    for(var i=0;i<ncols;i++) {
      for(var j=0;j<ncols;j++) {

        sum = 0;

        for(var k=0;k<nrows;k++) {
          sum += mtx[k*ncols+i]*mtx[k*ncols+j];
        }

        retval[i*ncols+j] = sum;
      }
    }

    return retval;
  };

  root.matrixInverseInPlace = function(mtx,n) {
    _matrixInvOfChol(mtx,n);

    for(var i=0;i<n;i++) { // upper triangle
      for(var j=i+1;j<n;j++) {
        for(var k=j;k<n;k++) {

          mtx[i*n+j] = mtx[i*n+j] + mtx[k*n+i]*mtx[k*n+j];

        }
      }
    }

    for(var l=0;l<n;l++) { // dlagonal
      mtx[l*n+l] = mtx[l*n+l]*mtx[l*n+l];

      for(var m=l+1;m<n;m++) {
        mtx[l*n+l] = mtx[l*n+l] + mtx[m*n+l]*mtx[m*n+l];
      }
    }

    for(var o=0;o<n;o++) { // copy upper troangle to lower
      for(var p=o+1;p<n;p++) {
        mtx[p*n+o] = mtx[o*n+p];
      }
    }
       
    /*

    ! ---------------------------------------------------
    !   Matrix inverse using Cholesky decomposition

    !   input    n  size of matrix
    !   input  A  Symmetric positive def. matrix
    !   output  aa  inverse of A
    !   uses        _matrixCholDecomp(int,MAT,VEC)
    ! ---------------------------------------------------
    Subroutine matrixInverse(n,A,aa)
      integer n
      real*8 A(0:n-1,0:n-1), aa(0:n-1,0:n-1)
      integer i,j,k

      call _matrixInvOfChol(n,A,aa)

      do i = 0, n-1
        do j = i + 1, n-1
        aa(i,j) = 0.d0
        end do
      end do

      do i = 0, n-1
        aa(i,i) = aa(i,i) * aa(i,i)
        do k = i + 1, n-1
          aa(i,i) = aa(i,i) + aa(k,i) * aa(k,i)
        end do

        do j = i + 1, n-1
          do k = j, n-1
            aa(i,j) = aa(i,j) + aa(k,i) * aa(k,j)
          end do
        end do
      end do
      do i = 0,  n-1
        do j = 0, i-1
          aa(i,j) = aa(j,i)
        end do
      end do
      return
    End

    */
  };

  function _matrixCholDecomp(mtx,n) {
    p = new Float32Array(n);

    for(var i=0; i<n; i++) { 

      for(var j=i; j<n; j++) { 

        sum = mtx[i*n+j];

        for(var k=i-1; k>=0; k--) {
          sum = sum - mtx[i*n+k] * mtx[j*n+k];
        }

        if(i == j) {

          if(sum <= 0) {
            throw new Error('Matrix is not positive definite!');
          } else {
            p[i] = Math.sqrt(sum);
            mtx[j*n+i] = p[i];
            
          }

        } else {

          mtx[j*n+i] = sum / p[i];

        }

      }

    }

    for(var l=0; l<n; l++) {
      for(var m=l+1; m<n; m++) {
        mtx[l*n+m] = 0;
      }
    }

    return {matrix: mtx, vector: p};
    /*
    ! -------------------------------------------------
    ! main method for Cholesky decomposition.
    !
    ! input         n  size of matrix
    ! input/output  a  matrix
    ! output        p  vector of resulting diag of a
    ! author:       <Vadum Kutsyy, kutsyy@hotmail.com>
    ! -------------------------------------------------
    Subroutine _matrixCholDecomp(n,a,p)

      integer n
      real*8 a(0:n-1,0:n-1), p(0:n-1)
      integer i,j,k
      real*8 sum
      do i = 0, n-1
        do j = i, n-1
          sum = a(i,j)
          do k = i - 1, 0, -1
            sum = sum - a(i,k) * a(j,k)
          end do
          if (i.eq.j) then
            if (sum <= 0.d0)  &
              print *,' the matrix is not positive definite!'
            p(i) = dsqrt(sum)
          else
            a(j,i) = sum / p(i)
          end if
      end do
      end do
      return
    End
    */
  }

  root.regress = function(xcolumns, ycolumn, alpha, add_constant, normalize) {
    if(add_constant === undefined) {
      add_constant = true;
    }

    if(normalize === undefined) {
      normalize = true;
    }

    if(alpha === undefined) {
      alpha = 0.05;
    }

    var resobj = {};

    var nvars = xcolumns.length;
    var nsamples = ycolumn.length;

    

    // Check if y is binary (0 or 1). If so, we use logistic regression. Otherwise linear regression

    var i,j;

    var useLogisticRegression = true;
    for (i=0;i<ycolumn.length;i++) {
      if(ycolumn[i] !== 0 && ycolumn[i] !== 1) {
        useLogisticRegression = false;
        break;
      }
    }


    var xMatrix = [];



    if(useLogisticRegression) {

      // console.log('Using logistic regression!');
      xMatrix = root.prepareRegressionData(xcolumns, true, true);

      nvars = xcolumns.length + 1;

      var trainingData = [];

      for(i=0; i < nsamples ; ++i) {

        var row = [];

        // No need to push the constant term in here, 
        // since jsregression adds it automatically.
        // That's why we start from index 1
        for(j=1; j<nvars; j++) {

          row.push(xMatrix[i*nvars+j]);

        }

        row.push(ycolumn[i]);

        trainingData.push(row);

      }
    

      // === Create the linear regression === //
      var logistic = new jsregression.LogisticRegression({
         alpha: 0.1,
         iterations: 1000,
         lambda: 0.01
      });

      // === Train the logistic regression === //

      var model = logistic.fit(trainingData);

      // === Print the trained model === //


      //      console.log(model);


      // === Testing the trained logistic regression === //

      var predictedProb = [];

      for(i=0; i < trainingData.length; ++i){
         predictedProb[i] = logistic.transform(trainingData[i]);
         //let predicted = logistic.transform(trainingData[i]) >= 0.5 ? 1 : 0;
      //   console.log("actual: " + trainingData[i][2] + " probability of being Iris-setosa: " + predictedProb[i]);
      //   console.log("actual: " + trainingData[i][2] + " predicted: " + predicted);
      }


      // === Calculate odds ratios === 

      // The standard errors of the model coefficients are the square 
      // roots of the diagonal entries of the covariance matrix.

      // covariance matrix = inv(tr(X)VX)

      // https://stats.stackexchange.com/questions/89484/how-to-compute-the-standard-errors-of-a-logistic-regressions-coefficients


      // Here we need the constant term
      var VX = xMatrix.slice();

      for(i=0;i<nsamples;i++) {
        for(j=0;j<nvars;j++) {

          VX[i*nvars+j] = VX[i*nvars+j] * predictedProb[i] * (1-predictedProb[i]);

        }
      }

      var XTVX = new Float32Array(nvars*nvars);

      for(var r = 0;r<nvars;r++) {
        for(var c = 0;c<nvars;c++) {

          XTVX[r*nvars+c] = 0;
          for(i = 0;i<nsamples;i++) {
            XTVX[r*nvars+c] += xMatrix[i*nvars+r]*VX[i*nvars+c];
          }

        }
      }

      root.matrixInverseInPlace(XTVX,nvars);


      resobj.pvalue = [];
      resobj.ci = [];
      resobj.beta = [];
      resobj.logisticRegression = true;

      for (i=0;i<nvars;i++) {

        var se = Math.sqrt(XTVX[(i)*nvars+(i)]);
        var or = Math.exp(model.theta[i]);

        // Pvalue = 2*pnorm(-abs(z))

        var zscore = model.theta[i] / se;


        //console.log("Beta for var " + i + " :" + model.theta[i] + " SE: "+ se + ", p-value: "+2*statDist.uprob(Math.abs(zscore)));
        //console.log("Odds ratio for var " + i + " :"  + or + " CI: "+Math.exp(model.theta[i] - 1.96*se) +" - "+Math.exp(model.theta[i] + 1.96*se) );

        resobj.pvalue.push(2*statDist.uprob(Math.abs(zscore)));
        resobj.ci.push([Math.exp(model.theta[i] - 1.96*se), Math.exp(model.theta[i] + 1.96*se)]);
        resobj.beta.push(or);
      }


    } else {


      xMatrix = root.prepareRegressionData(xcolumns, add_constant, normalize);
      //console.log("data");
      //console.log(xMatrix);

      if(add_constant) {
        nvars+=1;
      }

      // Linear regression here:
      // console.log('Using linear regression!');
      
      var normalTargetData = root.prepareRegressionData(ycolumn, false, normalize);
      
      var innerProductInv = root.matrixInnerProduct(xMatrix, nsamples, (nvars));

      root.matrixInverseInPlace(innerProductInv, nvars);

      var multi2 = root.matrixMultiplyTrB(innerProductInv, nvars, nvars, xMatrix, nsamples, nvars);

      var betas = root.matrixMultiply(multi2, nvars, nsamples, normalTargetData, nsamples, 1);



      
      // Calculating predicted data with betas

      predictedTargetData = root.matrixMultiply(xMatrix,nsamples, nvars, betas, nvars,1);

      // Calculating residuals

      root.matrixSubtractInPlace(normalTargetData, nsamples, 1, predictedTargetData, nsamples, 1);

      residuals = normalTargetData;
      normalTargetData = null;


      // MSE

      var sigma2 = root.matrixMultiply(residuals,1,nsamples,residuals,nsamples,1);

      var degrees =  nsamples - nvars;

      sigma2[0] = sigma2[0] / degrees;


      
      cmatrix = innerProductInv;
      innerProductInv = null;

      root.matrixScaleInPlace(cmatrix, nvars, nvars, sigma2[0]);

      

      resobj.pvalue = [];
      resobj.ci = [];
      resobj.logisticRegression = false;

      for(var_num = 0; var_num<nvars; var_num++) {


        var _sqrt = Math.sqrt(cmatrix[var_num * (nvars) + var_num]);

        var ci = statDist.tdistr(degrees, alpha/2) * _sqrt;

          var beta = betas[var_num];

          var t = Math.abs(beta / _sqrt);
          var pvalue = statDist.tprob(degrees, t) * 2;

          resobj.pvalue.push(pvalue);
          resobj.ci.push([beta - ci, beta + ci]);

      }

      resobj.beta = betas;
    }

    return resobj;
  };


  context.regressionUtils = root;
})(self);